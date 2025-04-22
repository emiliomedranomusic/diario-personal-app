// src/components/EntryList.js
import React from 'react';
import { List, ListItem, ListItemText } from '@mui/material';

const EntryList = ({ entries, onSelect, selectedEntry, onDelete }) => {
  const handleSelectEntry = (entry) => {
    if (typeof onSelect === 'function') {
      onSelect(entry);
    } else {
      // No-op to prevent error
    }
  };

  return (
    <List>
      {entries.map(entry => (
        <ListItem
          button
          key={entry.id}
          selected={selectedEntry && selectedEntry.id === entry.id}
          onClick={() => handleSelectEntry(entry)}
        >
          <ListItemText primary={entry.title} secondary={entry.tags ? entry.tags.join(', ') : ''} />
        </ListItem>
      ))}
    </List>
  );
};

export default EntryList;
