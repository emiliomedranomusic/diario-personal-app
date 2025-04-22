// src/components/EntryList.js
import React from 'react';
import { List, ListItem, ListItemText, ListItemIcon, ListItemButton } from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';

const EntryList = ({ entries, onSelect, selectedEntryId }) => {
  const handleSelectEntry = (entry) => {
    if (typeof onSelect === 'function') {
      onSelect(entry);
    }
  };

  return (
    <List dense>
      {entries.map(entry => (
        <ListItemButton
          key={entry.id}
          selected={selectedEntryId === entry.id}
          onClick={() => handleSelectEntry(entry)}
          sx={{ mb: 0.5, borderRadius: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: selectedEntryId === entry.id ? 'primary.main' : 'action.active' }}>
            <ArticleOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
              primary={entry.title || "Entrada sin título"}
              secondary={entry.tags ? entry.tags.join(', ') : ''}
              primaryTypographyProps={{ noWrap: true, fontWeight: selectedEntryId === entry.id ? 'bold' : 'normal' }}
              secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
          />
        </ListItemButton>
      ))}
    </List>
  );
};

export default EntryList;
