import shutil
from pathlib import Path

import kagglehub


def main() -> None:
    # Download latest version
    path = Path(kagglehub.dataset_download("pes12017000148/food-ingredients-and-recipe-dataset-with-images"))
    print("Path to dataset files:", path)

    project_root = Path(__file__).resolve().parents[1]
    target_dir = project_root / "assets" / "data" / "source"
    target_dir.mkdir(parents=True, exist_ok=True)

    source_csv = path / "Food Ingredients and Recipe Dataset with Image Name Mapping.csv"
    if not source_csv.exists():
        raise FileNotFoundError(f"Expected CSV not found: {source_csv}")

    target_csv = target_dir / "food-recipes.csv"
    shutil.copy2(source_csv, target_csv)
    print("Copied CSV to:", target_csv)


if __name__ == "__main__":
    main()
