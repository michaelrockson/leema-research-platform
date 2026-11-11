from dataclasses import dataclass
from enum import Enum


class PipelineStatus(str, Enum):
    """
    Outcome of a single pipeline run.

    SUCCESS:     The stage ran and produced new work for the next stage.
    NO_NEW_DATA: The stage ran fine but there was nothing new to do. This is
                 a normal outcome (e.g. every post found was already
                 collected) and must not be reported to users as an error.
    FAILED:      Something actually went wrong (API error, bad credentials...).
    """
    SUCCESS = "success"
    NO_NEW_DATA = "no_new_data"
    FAILED = "failed"


@dataclass
class PipelineResult:
    """
    Result returned by every pipeline's ``run`` method.

    ``message`` is written for end users: it is shown in the UI as-is, so it
    should explain what happened and, where useful, what to do next.
    """
    status: PipelineStatus
    message: str


    @classmethod
    def success(cls, message: str) -> "PipelineResult":
        return cls(PipelineStatus.SUCCESS, message)


    @classmethod
    def no_new_data(cls, message: str) -> "PipelineResult":
        return cls(PipelineStatus.NO_NEW_DATA, message)


    @classmethod
    def failed(cls, message: str) -> "PipelineResult":
        return cls(PipelineStatus.FAILED, message)


    @property
    def succeeded(self) -> bool:
        return self.status == PipelineStatus.SUCCESS


    @property
    def has_no_new_data(self) -> bool:
        return self.status == PipelineStatus.NO_NEW_DATA


    @property
    def has_failed(self) -> bool:
        return self.status == PipelineStatus.FAILED
