import styles from './App.module.css';
import TranslationCard from './TranslationCard.jsx';
import { createSignal, createResource, Switch, Match, Show } from "solid-js";
import { createTheme, ThemeProvider } from "@suid/material/styles";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
} from "@suid/material";
import Autocomplete from './Autocomplete';
import loadWiktionary from './wiktionary';


const fetchWord = async (word) => {
  const response = await fetch(`http://127.0.0.1:8000/word/${word}`);
  const pyResponse = response.json();
  return loadWiktionary(word);
}

const fetchAutocomplete = async (word) => {
  const response = await fetch(`http://127.0.0.1:8000/search/${word}`);
  // See https://www.mediawiki.org/wiki/API:Opensearch for the response format.
  const data = await response.json()
  return data[1];
}

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function wordFromLocation() {
  const locationParams = new URLSearchParams(window.location.search);
  let w = locationParams.get('w');
  if (!/^https?:/.test(w)) {
    return w;
  }
  const l = new URL(w).pathname.split('/');
  if (l && l.length) {
    return decodeURIComponent(l[l.length - 1]);
  }
  return "";
}

function App() {
  const defaultWord = wordFromLocation();
  const [word, setWord] = createSignal(defaultWord);
  const [translation, { mutate }] = createResource(word, fetchWord);
  const [submitState, setSubmitState] = createSignal(new Map());
  const [sent, setSent] = createSignal([]);
  const [added, setAdded] = createSignal([]);
  const addSent = (wordtype, word) => setSent((prev) => [...prev, `${wordtype}##${word}`]);
  const addAdded = (wordtype, word) => setAdded((prev) => [...prev, `${wordtype}##${word}`]);

  const handleChange = (evt, val) => {
    mutate(() => ({}));
    setWord(val);
  };
  const addNote = (wordtype, word, value) => {
    const [note_type, count] = wordtype == "Verb" ? ["Basic HU Verbs", 6] : ["Basic (and reversed card)", 2];
    const fields = Array(count).fill('');
    fields[0] = value.defn.join('\n');
    fields[1] = word;
    if (value.forms[0]?.data?.length && ["Verb", "Noun"].includes(wordtype)) {
      fields.splice(1, count - 1, ...value.forms[0]?.data);
    }
    const note = { note_type, fields };
    console.log("Submitting note", note);
    addSent(wordtype, word);
    fetch('http://127.0.0.1:8000/add_note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(`Failed to add note: ${response.code} ${response.statusText}, ${response.text()}`);
      })
      .then(data => { console.log('Success:', data); addAdded(wordtype, word); })
      .catch(error => console.error('Error:', error));
  }

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="sticky">
        <Toolbar sx={{ flexWrap: "wrap" }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Wiktionary Anki Connector
          </Typography>
          <Autocomplete fetchSuggestions={fetchAutocomplete} initialWord={word()} onChange={handleChange} />
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', flexWrap: "wrap", gap: theme.spacing(2), margin: theme.spacing(2) }}>
        <Show when={translation.loading}>
          <p>Loading...</p>
        </Show>
        <Switch>
          <Match when={translation.error}>
            <span>Error: {translation.error}</span>
          </Match>
          <Match when={translation()}>
            <For each={Object.entries(translation())}>
              {([wordtype, value]) => (
                <TranslationCard word={word()} wordtype={wordtype} data={value}
                  sent={sent().includes(`${wordtype}##${word()}`)}
                  added={added().includes(`${wordtype}##${word()}`)}
                  onAdd={() => addNote(wordtype, word(), value)} />
              )}
            </For>
          </Match>
        </Switch>
      </Box>
    </ThemeProvider>
  );
}

export default App;