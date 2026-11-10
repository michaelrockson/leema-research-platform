import asyncio
import random
import threading
import time
import weakref
from typing import Any, Coroutine, List

from tenacity import (
    RetryCallState,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

from settings import settings
from utils.logger import logger


class AsyncRateLimiter:
    """
    Async context manager that limits concurrent requests and request rate.

    Combines an asyncio.Semaphore (concurrency cap) with a token bucket
    (requests-per-minute cap). Both must be satisfied before a call proceeds.

    The pipelines call asyncio.run() once per stage (and FastAPI requests run
    in worker threads), so this module-level singleton is used from many
    different event loops over the process lifetime. asyncio primitives are
    bound to the loop they first wait on, so a Semaphore/Lock pair is created
    per event loop. The token bucket itself is shared across loops and
    guarded by a threading.Lock so the rate cap stays process-wide.
    """


    def __init__(self, max_rate: int, period: float = 60.0,
                 max_concurrency: int = 5) -> None:
        self.max_rate = max_rate
        self.period = period
        self.max_concurrency = max_concurrency
        self._tokens: float = float(max_rate)
        self._last_refill: float = time.monotonic()
        self._bucket_lock = threading.Lock()
        self._loop_primitives: "weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, tuple[asyncio.Semaphore, asyncio.Lock]]" = weakref.WeakKeyDictionary()
        self._primitives_lock = threading.Lock()


    def _primitives(self) -> "tuple[asyncio.Semaphore, asyncio.Lock]":
        loop = asyncio.get_running_loop()
        with self._primitives_lock:
            prims = self._loop_primitives.get(loop)
            if prims is None:
                prims = (asyncio.Semaphore(self.max_concurrency),
                         asyncio.Lock())
                self._loop_primitives[loop] = prims
            return prims


    def _try_take_token(self) -> float:
        """
        Refill the bucket and take a token if one is available.
        Returns 0.0 on success, otherwise the seconds to wait before retrying.
        """
        with self._bucket_lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            self._tokens = min(float(self.max_rate), self._tokens + (
                elapsed / self.period) * self.max_rate)
            self._last_refill = now
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return 0.0
            return (1.0 - self._tokens) / self.max_rate * self.period


    async def _acquire_token(self, lock: asyncio.Lock) -> None:
        async with lock:
            while True:
                wait_time = self._try_take_token()
                if wait_time <= 0.0:
                    return
                await asyncio.sleep(wait_time + random.uniform(0.05, 0.3))


    async def __aenter__(self) -> "AsyncRateLimiter":
        semaphore, lock = self._primitives()
        await semaphore.acquire()
        try:
            await self._acquire_token(lock)
        except BaseException:
            semaphore.release()
            raise
        return self


    async def __aexit__(self, *args: Any) -> None:
        semaphore, _ = self._primitives()
        semaphore.release()


# =====================================================
# SINGLETONS
# =====================================================
reddit_limiter = AsyncRateLimiter(
    max_rate = settings.REDDIT_MAX_REQUESTS_PER_MIN,
    period = 60.0,
    max_concurrency = settings.REDDIT_MAX_CONCURRENCY,
)

gemini_limiter = AsyncRateLimiter(
    max_rate = settings.GEMINI_MAX_REQUESTS_PER_MIN,
    period = 60.0,
    max_concurrency = settings.GEMINI_MAX_CONCURRENCY,
)


# =====================================================
# RETRY HELPERS
# =====================================================
def _is_rate_limit_error(exception: Exception) -> bool:
    error_text = str(exception).lower()
    return any(token in error_text for token in (
        "429", "too many requests", "rate limit",
        "resource_exhausted", "ratelimit", "quota",
    ))


def _log_before_retry(retry_state: RetryCallState) -> None:
    next_sleep = getattr(retry_state.next_action, "sleep", 0.0)
    logger.warning(
        f"Rate limit hit. Retry {retry_state.attempt_number} in {next_sleep:.1f}s — "
        f"{retry_state.outcome.exception()}"
    )


reddit_retry = retry(
    retry = retry_if_exception(_is_rate_limit_error),
    wait = wait_exponential_jitter(initial = 2, max = 60, jitter = 5),
    stop = stop_after_attempt(settings.REDDIT_MAX_RETRIES),
    before_sleep = _log_before_retry,
    reraise = True,
)

gemini_retry = retry(
    retry = retry_if_exception(_is_rate_limit_error),
    wait = wait_exponential_jitter(initial = 5, max = 120, jitter = 10),
    stop = stop_after_attempt(settings.GEMINI_MAX_RETRIES),
    before_sleep = _log_before_retry,
    reraise = True,
)


# =====================================================
# BATCHED GATHER
# =====================================================
async def batched_gather(
    coroutines: List[Coroutine],
    batch_size: int = 5,
    batch_delay: float = 1.5,
) -> List[Any]:
    """
    Runs coroutines in sequential batches to avoid API burst pressure.

    Args:
        coroutines:       List of coroutines to execute.
        batch_size:  Max coroutines to run concurrently per batch.
        batch_delay: Seconds to sleep between batches.

    Returns:
        Flat list of results. Exceptions are returned in-place, not raised.
    """
    results: List[Any] = []
    total = len(coroutines)

    for batch_start in range(0, total, batch_size):
        batch = coroutines[batch_start: batch_start + batch_size]
        batch_results = await asyncio.gather(*batch, return_exceptions = True)
        results.extend(batch_results)

        if batch_delay > 0 and batch_start + batch_size < total:
            await asyncio.sleep(batch_delay)

    return results
