#!/bin/bash
#cd /home/test_code/test01/rag-chatbot/backend
#source /home/test_code/.venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 9000 --log-level debug >> ./chatbot.log
