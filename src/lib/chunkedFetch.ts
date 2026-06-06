import { supabase } from './supabase';

export async function fetchInChunks(
  table: string,
  column: string,
  values: string[],
  queryBuilder: (query: any) => any,
  chunkSize = 30
) {
  let allData: any[] = [];
  
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    let query = supabase.from(table).select('*').in(column, chunk);
    query = queryBuilder(query);
    
    const { data, error } = await query;
    if (error) {
      console.error(`Error fetching chunk from ${table}:`, error);
      throw error;
    }
    if (data) {
      allData = allData.concat(data);
    }
  }
  
  return allData;
}
