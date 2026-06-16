# Problema: `unplugin-dts` genera i `.d.ts` in una sottocartella

## Contesto

Sto usando `unplugin-dts` (https://github.com/qmhc/unplugin-dts) come plugin Vite
per generare i file di dichiarazione TypeScript in una libreria.
I sorgenti si trovano in `src/`, il build output in `dist/`.

## Sintomo

Dopo il build, i file `.d.ts` vengono generati in `dist/src/` invece che
direttamente in `dist/`:

```
dist/
  src/
    index.d.ts       ← sbagliato
    Storage.d.ts
    ...
  index.js
  Storage.js
```

Questo rompe tutti i percorsi dichiarati in `package.json`
(`exports`, `types`, `typesVersions`).

## Causa

Senza `rootDir` impostato nel `tsconfig.json`, TypeScript calcola la radice pubblica
a partire dall'insieme di tutti i file sorgente, includendo la cartella `src/`
nel percorso relativo di output.

> **Nota**: l'opzione `entryRoot` di `unplugin-dts` **non risolve** il problema
> perché agisce solo sulla mappatura degli entry point dichiarati, non sul path
> di compilazione TypeScript sottostante.

## Soluzione

Passare `compilerOptions: { rootDir: path.resolve(__dirname, 'src') }` al plugin
in `vite.config.ts`, senza modificare il `tsconfig.json` principale:

```ts
import path from 'node:path'
import dts from 'unplugin-dts/vite'

// vite.config.ts
plugins: [
    dts({
        compilerOptions: {
            rootDir: path.resolve(__dirname, 'src')
        }
    })
]
```

## Risultato atteso

```
dist/
  index.d.ts       ← corretto
  Storage.d.ts
  ...
  index.js
  Storage.js
```

Il `package.json` può mantenere i percorsi piatti in `dist/` senza modifiche.
