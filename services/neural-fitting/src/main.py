"""Main entrypoint for Drape Neural Fitting Service (Docker / Standalone).

Exposes:
- FastAPI HTTP server for direct neural fitting & motion inference
- Background AMQP listener connecting to RabbitMQ queue `neural.motion.generate`
- Health check endpoint `/healthz`
"""

import json
import logging
import os
import threading
import time
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pika

from src.amqp_motion_consumer import (
    AMQPMotionConsumer,
    MotionGenerationRequest,
)
from src.worker import (
    FittingRequest,
    NeuralFittingWorker,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("drape-neural-fitting")

app = FastAPI(
    title="Drape Neural Fitting & Motion Service",
    version="0.1.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

motion_consumer = AMQPMotionConsumer()
fitting_worker = NeuralFittingWorker()


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "healthy", "service": "neural-fitting"}


@app.post("/api/v1/fittings/generate")
def generate_fitting(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute 3-stage neural garment fitting (C-037)."""
    try:
        request = FittingRequest.model_validate(payload)
        return fitting_worker.execute_fitting_job(request)
    except Exception as err:
        logger.error(f"Fitting generation error: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@app.post("/api/v1/motion/generate")
def generate_motion(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute 4-second 360° motion video synthesis (C-038)."""
    try:
        request = MotionGenerationRequest.model_validate(payload)
        return motion_consumer.execute_motion_job(request)
    except Exception as err:
        logger.error(f"Motion generation error: {err}")
        raise HTTPException(status_code=500, detail=str(err))


def run_amqp_consumer():
    """Background AMQP consumer thread connecting to RabbitMQ."""
    amqp_url = os.getenv("AMQP_URL", "amqp://drape:drape@rabbitmq:5672/")
    logger.info(f"Starting AMQP motion worker connecting to {amqp_url}...")

    while True:
        try:
            parameters = pika.URLParameters(amqp_url)
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            # Declare queues
            channel.queue_declare(queue="neural.motion.generate", durable=True)
            channel.queue_declare(queue="neural.motion.completed", durable=True)

            def on_motion_message(ch, method, properties, body):
                try:
                    payload = json.loads(body.decode("utf-8"))
                    logger.info(f"Received AMQP motion task for job: {payload.get('motionJobId')}")
                    request = MotionGenerationRequest.model_validate(payload)
                    result = motion_consumer.execute_motion_job(request)

                    # Publish completion notification
                    ch.basic_publish(
                        exchange="",
                        routing_key="neural.motion.completed",
                        body=json.dumps(result).encode("utf-8"),
                        properties=pika.BasicProperties(
                            delivery_mode=2,
                            correlation_id=properties.correlation_id,
                        ),
                    )
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    logger.info(f"Completed and acknowledged AMQP motion task: {result.get('motionJobId')}")
                except Exception as ex:
                    logger.error(f"Error processing AMQP message: {ex}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue="neural.motion.generate", on_message_callback=on_motion_message)
            logger.info("AMQP motion worker ready and listening on 'neural.motion.generate'...")
            channel.start_consuming()
        except Exception as err:
            logger.warning(f"AMQP connection error ({err}), retrying in 5 seconds...")
            time.sleep(5)


if __name__ == "__main__":
    import uvicorn

    amqp_enabled = os.getenv("ENABLE_AMQP", "true").lower() == "true"
    if amqp_enabled:
        consumer_thread = threading.Thread(target=run_amqp_consumer, daemon=True)
        consumer_thread.start()

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("src.main:app", host=host, port=port, log_level="info")
