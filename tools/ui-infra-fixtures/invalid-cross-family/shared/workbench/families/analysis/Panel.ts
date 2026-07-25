// Fixture (invalid): the analysis family imports the app-page family directly.
// Trips crossFamilyImport.
import { appPagePort } from '@shared/workbench/families/apppage';

export const panel = { uses: appPagePort };
