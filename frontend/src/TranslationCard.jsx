import styles from './App.module.css';
import { Show } from "solid-js";
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Typography,
  } from "@suid/material";


export default function TranslationCard(props) {
    const defn = () => props.data.defn;
    const forms = () => props.data.forms;
    return (
      <Card sx={{ width: 275, textAlign: "center", display: "flex", "flexDirection": 'column' }}>
        <Typography variant="h5" component="div">
          {props.word}
        </Typography>
        <Typography sx={{ fontSize: 14 }} color="text.secondary">
          {props.wordtype}
        </Typography>
        <CardContent>
            <For each={defn()}>
                {(definition) => (<Typography variant="body2" gutterBottom>{definition}</Typography>)}
            </For>
            <Typography sx={{ userSelect: "none" }} gutterBottom>{ forms()?.length ? "▰" : "" }</Typography>
            <For each={forms()}>
                {(form) => (<For each={form.data}>{(field) => (
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }} gutterBottom>{field}</Typography>
                )}</For>)}
            </For>
        </CardContent>
        <Box sx={{ flexGrow: 1 }}></Box>
        <CardActions sx={{ display: "flex", justifyContent: "center" }}>
          <Show when={!props.added} fallback={ <Box>✔️</Box> }>
            <Button variant="contained" onClick={props.onAdd} disabled={props.sent ? true : null}>Save to Anki</Button>
          </Show>
        </CardActions>
      </Card>
    );
}