import ast
import csv
import json
from pathlib import Path


def parse_ingredients(value: str) -> list[str]:
    if not value:
        return []
    try:
        parsed = ast.literal_eval(value)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    except (SyntaxError, ValueError):
        pass
    return [part.strip() for part in value.split(",") if part.strip()]


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    csv_path = project_root / "assets" / "data" / "source" / "food-recipes.csv"
    if not csv_path.exists():
        raise FileNotFoundError(
            "food-recipes.csv not found. Run scripts/download_food_dataset.py first."
        )

    output_dir = project_root / "assets" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_json = output_dir / "food-recipes-index.json"

    records = []
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            title = (row.get("Title") or "").strip()
            ingredients = parse_ingredients((row.get("Cleaned_Ingredients") or row.get("Ingredients") or "").strip())
            instructions = (row.get("Instructions") or "").strip()
            image_name = (row.get("Image_Name") or "").strip()

            if not title:
                continue

            records.append(
                {
                    "id": idx,
                    "title": title,
                    "ingredients": ingredients,
                    "instructions": instructions,
                    "imageName": image_name,
                }
            )

    with output_json.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False)

    print(f"Wrote {len(records)} records to {output_json}")


if __name__ == "__main__":
    main()
