import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

let cache = null;

export async function fetchSpecies(includeArchived = false) {
  const list = await base44.entities.Species.list('-created_date', 300);
  let result = list;
  if (!includeArchived) result = list.filter((s) => !s.archived);
  result = [...result].sort((a, b) => a.name.localeCompare(b.name));
  cache = result;
  return result;
}

export function useSpecies() {
  const [species, setSpecies] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    fetchSpecies().then((result) => {
      if (active) {
        setSpecies(result);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const reload = async () => {
    const result = await fetchSpecies();
    setSpecies(result);
  };

  return { species, loading, reload };
}

export function clearSpeciesCache() {
  cache = null;
}