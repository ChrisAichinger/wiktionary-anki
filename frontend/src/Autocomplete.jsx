import { createSignal, createEffect } from "solid-js";
import { TextField, List, ListItem } from "@suid/material";

const Autocomplete = (props) => {
    const [value, setValue] = createSignal(props.initialWord || "");
    const [suggestions, setSuggestions] = createSignal([]);
    const [listShown, setListShown] = createSignal(false);

    createEffect(() => {
        props.onChange?.(null, value());
    });
    createEffect(() => {
        const query = value();
        if (query.length === 0) {
            setSuggestions([]);
            return;
        }
        props.fetchSuggestions(query).then(setSuggestions).catch(console.error);
    });

    return (
        <div>
            <TextField
                value={value()}
                onChange={(e, val) => { setValue(val); }}
                onFocus={() => setListShown(true)}
                onBlur={() => setListShown(false)}
                placeholder="Type to search..."
                variant="standard"
            />
            {listShown() && suggestions().length > 0 && (
                <List
                    sx={{
                        position: 'absolute',
                        zIndex: 1,
                        width: '100%',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    }}
                >
                    {suggestions().map((suggestion) => (
                        <ListItem
                            key={suggestion}
                            onMouseDown={() => {
                                setValue(suggestion);
                                setListShown(false);
                            }}
                            sx={{
                                cursor: 'default',
                                userSelect: 'none',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                },
                            }}
                        >
                            {suggestion}
                        </ListItem>
                    ))}
                </List>
            )}
        </div>
    );
};

export default Autocomplete;