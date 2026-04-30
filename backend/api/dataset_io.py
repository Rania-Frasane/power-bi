"""Load tabular data from stored dataset files."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

import pandas as pd

from .analysis import coerce_tabular_dataframe

if TYPE_CHECKING:
    from .models import Dataset


def load_tabular_dataframe(dataset: "Dataset") -> Optional[pd.DataFrame]:
    """
    Read CSV / Excel / JSON from the dataset file field into a DataFrame.

    Returns None when there is no file or the source type is not tabular.
    Raises ValueError (or pandas errors) when the file cannot be parsed.
    """
    if not dataset.file:
        return None

    dataset.file.seek(0)

    if dataset.source_type == "csv":
        df = pd.read_csv(dataset.file)
    elif dataset.source_type == "excel":
        df = pd.read_excel(dataset.file)
    elif dataset.source_type == "json":
        df = pd.read_json(dataset.file)
    else:
        return None

    return coerce_tabular_dataframe(df)
