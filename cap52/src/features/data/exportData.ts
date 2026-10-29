import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { DbContext } from '../../database/db';
import { exportAllData } from '../../database/repositories';
import { todayLocal } from '../../domain/dates';

/** Écrit toutes les données locales dans un fichier JSON et ouvre la feuille de partage native. */
export async function exportDataFile(ctx: DbContext): Promise<void> {
  const data = await exportAllData(ctx);
  const file = new File(Paths.cache, `cap52-export-${todayLocal()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Partage indisponible');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'CAP 52', UTI: 'public.json' });
}
