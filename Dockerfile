FROM python:3.9
RUN apt update && apt-get install --no-install-recommends -y nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
WORKDIR /app
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt
COPY ./frontend/package.json ./frontend/pnpm-lock.yaml /app/frontend/
RUN cd frontend && pnpm i
COPY *.py /app/
COPY frontend/*json frontend/*js frontend/*html /app/frontend/
COPY frontend/src /app/frontend/src
RUN cd frontend && ls -al && pnpm run build
CMD ["fastapi", "run", "/app/main.py", "--port", "80"]
