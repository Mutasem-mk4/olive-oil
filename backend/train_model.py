import argparse
import csv
import json
import pickle
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.base import clone
from sklearn.ensemble import (
    ExtraTreesClassifier,
    HistGradientBoostingClassifier,
    RandomForestClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from xgboost import XGBClassifier


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_PATH = BASE_DIR / "eem_features.csv"
DEFAULT_MODEL_PATH = BASE_DIR / "model.pkl"
DEFAULT_METRICS_PATH = BASE_DIR / "model_metrics.json"

SOURCE_TARGET_COLUMN = "aging_step"
DEFAULT_TARGET = "quality_band"
TARGET_CHOICES = ("quality_band", "aging_step")
QUALITY_BAND_LABELS = {
    0: "fresh_or_lightly_aged",
    1: "oxidized",
    2: "degraded",
}
IGNORED_COLUMNS = {"filename", SOURCE_TARGET_COLUMN}


def load_dataset(csv_path: Path) -> tuple[np.ndarray, np.ndarray, list[str]]:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    if not rows:
        raise ValueError(f"No rows found in {csv_path}")

    feature_names = [
        column
        for column in rows[0].keys()
        if column not in IGNORED_COLUMNS
    ]
    if not feature_names:
        raise ValueError("No numeric feature columns found.")

    X: list[list[float]] = []
    y: list[int] = []
    for row_number, row in enumerate(rows, start=2):
        try:
            X.append([float(row[name]) for name in feature_names])
            y.append(int(row[SOURCE_TARGET_COLUMN]))
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Invalid training row {row_number}: {exc}") from exc

    return np.asarray(X, dtype=np.float32), np.asarray(y, dtype=np.int64), feature_names


def xgboost_model(num_classes: int) -> XGBClassifier:
    objective = "binary:logistic" if num_classes == 2 else "multi:softprob"
    class_params = {} if num_classes == 2 else {"num_class": num_classes}
    return XGBClassifier(
        objective=objective,
        **class_params,
        n_jobs=-1,
        n_estimators=180,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        eval_metric="logloss" if num_classes == 2 else "mlogloss",
        tree_method="hist",
        random_state=42,
    )


def model_candidates(num_classes: int) -> dict[str, object]:
    xgboost = xgboost_model(num_classes)
    extra_trees = ExtraTreesClassifier(
        n_estimators=600,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    random_forest = RandomForestClassifier(
        n_estimators=600,
        max_depth=6,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    hist_gradient_boosting = HistGradientBoostingClassifier(
        max_iter=250,
        learning_rate=0.04,
        l2_regularization=0.1,
        random_state=42,
    )
    svm_rbf = make_pipeline(StandardScaler(), SVC(
        C=3.0,
        kernel="rbf",
        probability=True,
        class_weight="balanced",
        random_state=42,
    ))
    logistic_regression = make_pipeline(
        StandardScaler(),
        LogisticRegression(
            C=1.0,
            max_iter=2000,
            class_weight="balanced",
            random_state=42,
        ),
    )

    return {
        "xgboost": xgboost,
        "extra_trees": extra_trees,
        "random_forest": random_forest,
        "hist_gradient_boosting": hist_gradient_boosting,
        "svm_rbf": svm_rbf,
        "logistic_regression": logistic_regression,
        "vote_xgboost_logistic_forest": VotingClassifier(
            estimators=[
                ("xgboost", xgboost),
                ("logistic_regression", logistic_regression),
                ("random_forest", random_forest),
            ],
            voting="soft",
        ),
        "vote_xgboost_logistic_histgb": VotingClassifier(
            estimators=[
                ("xgboost", xgboost),
                ("logistic_regression", logistic_regression),
                ("hist_gradient_boosting", hist_gradient_boosting),
            ],
            voting="soft",
        ),
    }


def make_target(aging_steps: np.ndarray, target: str) -> tuple[np.ndarray, dict[int, str]]:
    if target == "aging_step":
        classes = sorted(int(value) for value in np.unique(aging_steps))
        return aging_steps, {label: str(label) for label in classes}

    if target != "quality_band":
        raise ValueError(f"Unsupported target: {target}")

    quality_band = np.where(aging_steps <= 2, 0, np.where(aging_steps <= 6, 1, 2))
    return quality_band.astype(np.int64), QUALITY_BAND_LABELS


def candidate_scores(
    candidates: dict[str, object],
    X_train: np.ndarray,
    y_train: np.ndarray,
) -> dict[str, dict[str, float | list[float]]]:
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores: dict[str, dict[str, float | list[float]]] = {}
    for model_name, estimator in candidates.items():
        fold_scores = cross_val_score(
            estimator,
            X_train,
            y_train,
            cv=cv,
            scoring="balanced_accuracy",
        )
        scores[model_name] = {
            "balanced_accuracy_mean": round(float(np.mean(fold_scores)), 4),
            "balanced_accuracy_std": round(float(np.std(fold_scores)), 4),
            "balanced_accuracy_scores": [round(float(score), 4) for score in fold_scores],
        }
    return scores


def best_candidate_name(scores: dict[str, dict[str, float | list[float]]]) -> str:
    return max(scores, key=lambda model_name: float(scores[model_name]["balanced_accuracy_mean"]))


def train(data_path: Path, model_path: Path, metrics_path: Path, target: str = DEFAULT_TARGET) -> dict:
    X, y, feature_names = load_dataset(data_path)
    y_target, class_labels = make_target(y, target)
    classes = sorted(int(value) for value in np.unique(y_target))
    class_to_index = {label: index for index, label in enumerate(classes)}
    index_to_class = {index: label for label, index in class_to_index.items()}
    y_encoded = np.asarray([class_to_index[int(label)] for label in y_target], dtype=np.int64)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_encoded,
        test_size=0.25,
        random_state=42,
        stratify=y_encoded,
    )

    candidates = model_candidates(num_classes=len(classes))
    selection_scores = candidate_scores(candidates, X_train, y_train)
    selected_model_name = best_candidate_name(selection_scores)
    selected_estimator = clone(candidates[selected_model_name])
    selected_estimator.fit(X_train, y_train)

    y_pred = selected_estimator.predict(X_test)
    y_test_labels = np.asarray([index_to_class[int(label)] for label in y_test])
    y_pred_labels = np.asarray([index_to_class[int(label)] for label in y_pred])
    final_model = clone(candidates[selected_model_name])
    final_model.fit(X, y_encoded)

    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "data_path": str(data_path.name),
        "task": f"{target}_classification",
        "target": target,
        "source_target": SOURCE_TARGET_COLUMN,
        "model_type": type(final_model).__name__,
        "selected_model": selected_model_name,
        "row_count": int(X.shape[0]),
        "feature_count": int(X.shape[1]),
        "feature_names": feature_names,
        "class_labels": {
            str(label): class_labels.get(label, str(label)) for label in classes
        },
        "class_distribution": {
            str(label): count for label, count in sorted(Counter(y_target).items())
        },
        "holdout": {
            "test_size": int(X_test.shape[0]),
            "accuracy": round(float(accuracy_score(y_test_labels, y_pred_labels)), 4),
            "balanced_accuracy": round(
                float(balanced_accuracy_score(y_test_labels, y_pred_labels)),
                4,
            ),
            "macro_f1": round(float(f1_score(y_test_labels, y_pred_labels, average="macro")), 4),
            "classification_report": classification_report(
                y_test_labels,
                y_pred_labels,
                labels=classes,
                output_dict=True,
                zero_division=0,
            ),
            "confusion_matrix": confusion_matrix(
                y_test_labels,
                y_pred_labels,
                labels=classes,
            ).tolist(),
        },
        "cross_validation": {
            "folds": 5,
            "scope": "training_split_model_selection",
            **selection_scores[selected_model_name],
        },
        "candidate_models": selection_scores,
        "limitations": [
            "This dataset labels fluorescence aging_step only; it does not contain authentic/fake/adulterated labels.",
            "The default model predicts quality_band derived from aging_step: 0=fresh/lightly aged, 1=oxidized, 2=degraded.",
            "The trained model consumes EEM feature rows, not smartphone camera pixels.",
            "Camera fraud detection still requires a labeled image dataset collected under controlled lighting.",
        ],
    }

    bundle = {
        "model": final_model,
        "model_name": selected_model_name,
        "feature_names": feature_names,
        "classes": classes,
        "class_labels": class_labels,
        "target": target,
        "metrics": metrics,
    }

    with model_path.open("wb") as handle:
        pickle.dump(bundle, handle)

    with metrics_path.open("w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)
        handle.write("\n")

    return metrics


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the olive oil EEM aging model.")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument("--model-out", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--metrics-out", type=Path, default=DEFAULT_METRICS_PATH)
    parser.add_argument("--target", choices=TARGET_CHOICES, default=DEFAULT_TARGET)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    metrics = train(args.data, args.model_out, args.metrics_out, args.target)
    print(json.dumps({
        "model": str(args.model_out),
        "metrics": str(args.metrics_out),
        "target": metrics["target"],
        "selected_model": metrics["selected_model"],
        "holdout_balanced_accuracy": metrics["holdout"]["balanced_accuracy"],
        "cv_balanced_accuracy_mean": metrics["cross_validation"]["balanced_accuracy_mean"],
        "limitations": metrics["limitations"],
    }, indent=2))


if __name__ == "__main__":
    main()
