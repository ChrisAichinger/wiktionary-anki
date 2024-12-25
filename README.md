# Wiktionary-Anki connector


[Anki](https://apps.ankiweb.net/) is a program which makes remembering things
easy. You create flashcards (question-answer pairs) and Anki asks you the
questions more frequently the harder it is for you. It is a fantastic tool to
learn languages, study for university, or remember people's names, ...

Wiktionary-Anki helps you create Anki questions for language learning, based on
data from [Wiktionary](https://www.wiktionary.org/). It is a web app where you
look up words and can add them directly to your Anki deck.

Currently supported languages:

* Hungarian


## Usage

Wiktionary-Anki is easiest deployed with [Docker](https://www.docker.com/).
If you use [docker-compose](https://docs.docker.com/compose/), you can run it like this:

* Clone this repository
* Build your own `.env` file from `.env.example`
* Adapt the following docker-compose template to your needs:
  ```yaml
    wiktionary-anki:
        env_file:
            - ~/export/wiktionary-anki/.env
        restart: always
        hostname: wiktionary-anki.your-server.com
        container_name: wiktionary-anki
        networks:
            - your-docker-network
        image: wiktionary-anki
        build: path/to/this/directory
  ```
* Run the container


## Development

Wiktionary-Anki uses Python's [FastAPI](https://fastapi.tiangolo.com/) as backend server.
You can set it up like this:

```bash
python -m venv venv                # Create a virtual environment
source venv/bin/activate           # On Linux, MacOS, ... OR
venv/Scripts/activate.bat          # On Windows systems
pip install -r requirements.txt    # Install the Python dependencies into the venv
fastapi dev main.py                # Start fastapi server in development mode
```

The Javascript UI is written in [SolidJS](https://www.solidjs.com/) and uses
[pnpm](https://pnpm.io/) as package manager. First [install
pnpm](https://pnpm.io/installation), then run the development server:

```bash
cd frontend
pnpm i            # Install JS dependencies
pnpm run dev      # Start the development server
```
