#!/usr/bin/env python3
"""
Quick stats workbench for this project.

Examples:
  python stats_workbench.py
  python stats_workbench.py --column Anglerfish
  python stats_workbench.py --compare Anglerfish "Seabed mining"
  python stats_workbench.py --file data/SeabedMining_Anglerfish.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable

import pandas as pd


DEFAULT_FILE_CANDIDATES = [
    Path("seabedmining_anglerfish.csv"),
    Path("data/seabedmining_anglerfish.csv"),
    Path("SeabedMining_Anglerfish.csv"),
    Path("data/SeabedMining_Anglerfish.csv"),
]


def normalize_name(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


def resolve_file_path(path: Path) -> Path:
    if path.exists():
        return path
    for candidate in DEFAULT_FILE_CANDIDATES:
        if candidate.exists():
            return candidate
    raise SystemExit(f"CSV not found: {path}")


def numeric_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c != "Date" and pd.api.types.is_numeric_dtype(df[c])]


def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    date_col = resolve_column_name(df, "Date")
    if date_col:
        if date_col != "Date":
            df = df.rename(columns={date_col: "Date"})
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    for col in df.columns:
        if col != "Date":
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def resolve_column_name(df: pd.DataFrame, requested: str) -> str | None:
    if requested in df.columns:
        return requested
    target = normalize_name(requested)
    for col in df.columns:
        if normalize_name(col) == target:
            return col
    return None


def print_describe(df: pd.DataFrame, cols: Iterable[str]) -> None:
    cols = [c for c in cols if c in df.columns]
    if not cols:
        print("No valid numeric columns selected.")
        return
    print("\n=== DESCRIPTIVE STATS ===")
    print(df[cols].describe().T.to_string(float_format=lambda x: f"{x:,.3f}"))


def print_top_days(df: pd.DataFrame, col: str, n: int = 10) -> None:
    col_name = resolve_column_name(df, col)
    if not col_name:
        print(f'Column "{col}" not found.')
        return
    top_cols = [col_name]
    if "Date" in df.columns:
        top_cols = ["Date", col_name]
    top = df[top_cols].dropna().sort_values(col_name, ascending=False).head(n)
    print(f"\n=== TOP {n} DAYS: {col_name} ===")
    print(top.to_string(index=False))


def print_compare(df: pd.DataFrame, a: str, b: str) -> None:
    a_name = resolve_column_name(df, a)
    b_name = resolve_column_name(df, b)
    if not a_name or not b_name:
        print(f'Compare failed. One of "{a}" or "{b}" is missing.')
        return
    pair = df[[a_name, b_name]].dropna()
    if pair.empty:
        print("No overlapping non-null rows for comparison.")
        return
    corr = pair[a_name].corr(pair[b_name])
    mean_diff = pair[a_name].mean() - pair[b_name].mean()
    print(f"\n=== COMPARISON: {a_name} vs {b_name} ===")
    print(f"Rows compared: {len(pair):,}")
    print(f"Pearson correlation: {corr:,.4f}")
    print(f"Mean difference ({a_name} - {b_name}): {mean_diff:,.3f}")


def pick_default_column(df: pd.DataFrame, cols: list[str]) -> str:
    for preferred in ("Anglerfish", "Seabed mining", "SeabedMining"):
        resolved = resolve_column_name(df, preferred)
        if resolved and resolved in cols:
            return resolved
    return cols[0]


def main() -> None:
    parser = argparse.ArgumentParser(description="Run quick stats on project CSV data.")
    parser.add_argument(
        "--file",
        type=Path,
        default=DEFAULT_FILE_CANDIDATES[0],
        help="CSV file path (defaults to seabedmining_anglerfish.csv variants)",
    )
    parser.add_argument("--column", type=str, default=None, help="Column for top-day output")
    parser.add_argument("--compare", nargs=2, metavar=("A", "B"), help="Two columns to compare")
    args = parser.parse_args()

    selected_file = resolve_file_path(args.file)
    df = load_data(selected_file)
    cols = numeric_columns(df)
    if not cols:
        raise SystemExit("No numeric columns found in CSV.")

    top_col = args.column if args.column else pick_default_column(df, cols)

    print(f"Loaded: {selected_file}")
    print(f"Rows: {len(df):,}")
    if "Date" in df.columns and df["Date"].notna().any():
        print(f"Date range: {df['Date'].min().date()} -> {df['Date'].max().date()}")

    print_describe(df, cols)
    print_top_days(df, top_col, n=10)

    if args.compare:
        print_compare(df, args.compare[0], args.compare[1])


if __name__ == "__main__":
    main()
