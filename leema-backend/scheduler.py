from datetime import datetime, timedelta

from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.blocking import BlockingScheduler

from services.jobs_service import (
    cleanup_curated_data_job,
    run_all_pipelines_job,
    run_scout_bot_job,
)
from utils.logger import logger

job_stores = {
    'default': SQLAlchemyJobStore(url = 'sqlite:///jobs.sqlite')
}

executors = {
    'default': ThreadPoolExecutor(max_workers = 1)
}

job_defaults = {
    'coalesce': True,
    'misfire_grace_time': None,
}

scheduler = BlockingScheduler(
    jobstores = job_stores,
    executors = executors,
    job_defaults = job_defaults,
)

# Schedule pipeline runs every week
scheduler.add_job(
    run_scout_bot_job,
    trigger = "interval",
    weeks = 1,
    next_run_time = datetime.now() + timedelta(seconds = 10),
    id = "run_scout_bot",
    replace_existing = True
)

# Schedule pipeline runs every 2 weeks
scheduler.add_job(
    run_all_pipelines_job,
    trigger = "interval",
    weeks = 2,
    next_run_time = datetime.now() + timedelta(seconds = 10),
    id = "full_pipeline_sequence",
    replace_existing = True
)

# Schedule cleanup runs every 2 weeks
scheduler.add_job(
    cleanup_curated_data_job,
    trigger = "interval",
    weeks = 2,
    next_run_time = datetime.now() + timedelta(days = 1),
    id = "cleanup_curated_data",
    replace_existing = True
)

logger.info("Agent starting. Scheduler is now running...")
scheduler.start()
