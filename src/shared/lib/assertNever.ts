// Exhaustiveness helper for discriminated unions.
//
// Call this in the `default:` branch (or the unreachable tail) of a switch over
// a tagged union. Because the parameter is typed `never`, TypeScript only lets
// the call compile when every variant has already been handled — so adding a
// new variant to the union turns every such switch into a COMPILE error that
// points you at the site to update, instead of a silent runtime fallthrough.
//
//   switch (signal.kind) {
//     case 'metric': return …;
//     case 'dsl':    return …;
//     default:       return assertNever(signal);
//   }
export function assertNever(x: never, message = 'Unhandled union variant'): never {
  throw new Error(`${message}: ${JSON.stringify(x)}`);
}
