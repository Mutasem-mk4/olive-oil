import argparse
import csv
import json
import os
from collections import Counter, defaultdict
from pathlib import Path
from urllib import request as urlrequest


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
LABELS = ("pure_evoo", "light_adulteration", "heavy_adulteration")


def azure_settings() -> dict[str, str]:
    settings = {
        "endpoint": os.getenv("AZURE_CUSTOM_VISION_PREDICTION_ENDPOINT", "").rstrip("/"),
        "key": os.getenv("AZURE_CUSTOM_VISION_PREDICTION_KEY", ""),
        "project_id": os.getenv("AZURE_CUSTOM_VISION_PROJECT_ID", ""),
        "published_name": os.getenv("AZURE_CUSTOM_VISION_PUBLISHED_NAME", ""),
    }
    missing = [name for name, value in settings.items() if not value]
    if missing:
        raise RuntimeError(f"Missing Azure Custom Vision settings: {', '.join(missing)}")
    return settings


def image_paths(dataset_dir: Path) -> list[tuple[str, Path]]:
    samples: list[tuple[str, Path]] = []
    for label in LABELS:
        class_dir = dataset_dir / label
        if not class_dir.exists():
            continue
        for image_path in sorted(class_dir.rglob("*")):
            if image_path.suffix.lower() in IMAGE_EXTENSIONS:
                samples.append((label, image_path))
    return samples


def predict_image(image_path: Path, settings: dict[str, str]) -> tuple[str, float]:
    prediction_url = (
        f"{settings['endpoint']}/customvision/v3.0/Prediction/"
        f"{settings['project_id']}/classify/iterations/{settings['published_name']}/image"
    )
    request = urlrequest.Request(
        prediction_url,
        data=image_path.read_bytes(),
        headers={
            "Prediction-Key": settings["key"],
            "Content-Type": "application/octet-stream",
        },
        method="POST",
    )
    with urlrequest.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    predictions = payload.get("predictions") or []
    if not predictions:
        return "no_prediction", 0.0
    top_prediction = predictions[0]
    return str(top_prediction.get("tagName")), round(float(top_prediction.get("probability", 0)) * 100, 2)


def metrics(rows: list[dict[str, str | float]]) -> dict[str, object]:
    total = len(rows)
    correct = sum(1 for row in rows if row["expected"] == row["predicted"])
    per_class = {}
    confusion: dict[str, Counter] = defaultdict(Counter)
    for row in rows:
        expected = str(row["expected"])
        predicted = str(row["predicted"])
        confusion[expected][predicted] += 1

    for label in LABELS:
        class_rows = [row for row in rows if row["expected"] == label]
        class_correct = sum(1 for row in class_rows if row["predicted"] == label)
        per_class[label] = {
            "count": len(class_rows),
            "accuracy": round(class_correct / len(class_rows), 4) if class_rows else None,
        }

    return {
        "total": total,
        "correct": correct,
        "accuracy": round(correct / total, 4) if total else 0,
        "per_class": per_class,
        "confusion_matrix": {
            label: {prediction: count for prediction, count in sorted(counter.items())}
            for label, counter in sorted(confusion.items())
        },
    }


def write_csv(rows: list[dict[str, str | float]], output_path: Path) -> None:
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["path", "expected", "predicted", "confidence"])
        writer.writeheader()
        writer.writerows(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate Azure Custom Vision on a blind image dataset.")
    parser.add_argument("dataset_dir", type=Path, help="Folder with class subfolders: pure_evoo, light_adulteration, heavy_adulteration.")
    parser.add_argument("--output", type=Path, default=Path("camera_eval_results.csv"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = azure_settings()
    samples = image_paths(args.dataset_dir)
    if not samples:
        raise RuntimeError(f"No JPG or PNG images found under {args.dataset_dir}")

    rows = []
    for expected, image_path in samples:
        predicted, confidence = predict_image(image_path, settings)
        rows.append({
            "path": str(image_path),
            "expected": expected,
            "predicted": predicted,
            "confidence": confidence,
        })

    write_csv(rows, args.output)
    print(json.dumps({
        "output": str(args.output),
        **metrics(rows),
    }, indent=2))


if __name__ == "__main__":
    main()
