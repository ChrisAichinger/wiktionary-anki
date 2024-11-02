#!/usr/bin/env python
# coding: utf-8

import concurrent.futures
from contextlib import closing

import anki
import anki.lang
from anki.collection import Collection
from anki.importing.noteimp import ForeignNote, NoteImporter, IGNORE_MODE
import anki.importing.csvfile
from anki import sync_pb2

from pydantic import BaseModel


#################
# Importing Notes
#################

class Note(BaseModel):
    note_type: str
    fields: list[str]


class PyImporter(NoteImporter):
    importMode = IGNORE_MODE

    def __init__(self, col: Collection, model, notes: list[list[str]]) -> None:
        """Import a list of notes into the current deck with the current model"""
        NoteImporter.__init__(self, col, file=None)
        self.model = model
        self.num_fields = len(self.model['flds'])
        self.to_add = []
        for fields in notes:
            assert len(fields) == self.num_fields, \
                f"Wrong field count for note type {self.model['name']!r}: {fields!r}"
            self.to_add.append(ForeignNote())
            self.to_add[-1].fields.extend(fields)
        self.initMapping()

    def fields(self) -> int:
        return self.num_fields

    def foreignNotes(self) -> list[ForeignNote]:
        return self.to_add


def import_note(filename: str, deck: str, note: Note):
    anki.lang.set_lang('en')
    col = Collection(filename)
    with closing(col):
        m = col.models.by_name(note.note_type)
        assert m, f"Unknown note type {note.note_type!r}"

        d = col.decks.by_name(deck)
        assert d, f"Unknown deck {deck!r}"
        col.decks.set_current(d['id'])
        assert col.decks.current()['name'] == deck, "Failed to select deck"

        fields = [f['name'] for f in m['flds']]
        assert len(fields) == len(note.fields), \
            f"Unexpected number of fields: len({fields}) != len({note.fields})"
        imp = PyImporter(col, m, [note.fields])
        imp.run()


#################
# Collection Sync
#################

SYNC_STATUS_MAP = {v: k for k, v in sync_pb2.SyncStatusResponse.Required.items()}

def sync(filename, sync_user, sync_pass):
    anki.lang.set_lang('en')
    col = Collection(filename)
    with closing(col):
        return sync_collection(col, sync_user, sync_pass)


def sync_collection(col: Collection, sync_user: str, sync_pass: str):
    """Synchronize the collection and return the status"""
    auth = run_in_thread(col.sync_login, sync_user, sync_pass, None)
    status = col.sync_status(auth)
    required = SYNC_STATUS_MAP[status.required]
    if required == 'NO_CHANGES':
        return
    sync_result = run_in_thread(col.sync_collection, auth, sync_media=False)
    if sync_result.required == 'FULL_DOWNLOAD':
        # `auth2` solves the "missing original size" error.
        # See https://github.com/ankidroid/Anki-Android/issues/14219
        auth2 = auth
        if sync_result.new_endpoint:
            print(sync_result.new_endpoint)
            auth2 = sync_pb2.SyncAuth(hkey=auth.hkey, endpoint=sync_result.new_endpoint)
            result = run_in_thread(col.full_upload_or_download,
                                   auth=auth2,
                                   server_usn=sync_result.server_media_usn,
                                   upload=False)
    required2 = SYNC_STATUS_MAP[col.sync_status(auth).required]
    if required2 != 'NO_CHANGES':
        raise RuntimeError(f"Sync failed: {required2}")



def run_in_thread(fn, *args, **kwargs):
    """Run a function in a thread and return the result

    The anki library prints an angry traceback if the sync is started on the main thread.
    This helper function pushes functions into a separate thread to avoid the warning.
    """

    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(fn, *args, **kwargs)
        return future.result()