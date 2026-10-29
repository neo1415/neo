Each file here is owned by one feature area and exports:

    export const area = { id: 'agency', init: (): AgencyState => ({ ... }) };
    export const agency = (w: World) => w.areas.agency as AgencyState;   // typed accessor

The slice lives in the one store (World v4), so it persists, syncs across tabs and resets with the demo.
