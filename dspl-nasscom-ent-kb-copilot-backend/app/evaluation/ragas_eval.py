"""RAGAS evaluation module for retrieval and answer quality checks."""

from typing import List, Dict, Any
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset
from app.generation.llm import get_llm
from app.retrieval.embedder import get_embedder
from app.core.logging import get_logger

logger = get_logger(__name__)

def run_ragas_evaluation(test_set: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Run RAGAS evaluation on a test set.
    
    Args:
        test_set: List of dicts with keys:
            - "question": str
            - "answer": str
            - "contexts": List[str]
            - "ground_truth": str
            
    Returns:
        Evaluation results.
    """
    dataset = Dataset.from_list(test_set)
    
    llm = get_llm()
    embeddings = get_embedder()
    
    result = evaluate(
        dataset=dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
        ],
        llm=llm,
        embeddings=embeddings,
    )
    
    logger.info("ragas_evaluation_complete", scores=result)
    return result.to_pandas().to_dict()
