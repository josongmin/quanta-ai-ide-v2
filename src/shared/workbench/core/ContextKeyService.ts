// Context key projection (WB-204).
//
// Keys are scope-local; resolution walks the scope's ancestor chain with nearer
// scopes shadowing ancestors. Disposing a child removes its layer and restores
// the parent projection. When-expression evaluation is fail-closed: an unknown
// key or a non-boolean value is a typed error, never a silent false.
//
// Screen payloads are NOT stored here — values are primitives only.
import { type Result, type WhenExpr, ok, err, fail } from '../contract';
import type { ScopeNode } from './ScopeNode';

export type ContextValue = string | number | boolean;

export class ContextKeyService {
  private readonly layers = new Map<ScopeNode, Map<string, ContextValue>>();

  set(scope: ScopeNode, key: string, value: ContextValue): Result<void> {
    if (!scope.isActive()) {
      return err(fail('scope-disposed', `cannot set context on a disposed scope`, { path: key }));
    }
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      return err(fail('context-type-mismatch', `context key ${key} must be a primitive value`, { path: key }));
    }
    let layer = this.layers.get(scope);
    if (layer === undefined) {
      layer = new Map<string, ContextValue>();
      this.layers.set(scope, layer);
      // Dispose restores the parent projection by dropping this layer.
      scope.registerDisposable(() => this.layers.delete(scope));
    }
    layer.set(key, value);
    return ok(undefined);
  }

  // Nearest-scope-wins lookup up the live parent chain.
  lookup(scope: ScopeNode, key: string): ContextValue | undefined {
    let node: ScopeNode | null = scope;
    while (node !== null) {
      const value = this.layers.get(node)?.get(key);
      if (value !== undefined) return value;
      node = node.parent;
    }
    return undefined;
  }

  // Deterministic and registration-order-independent: depends only on the
  // current projected values.
  evaluate(scope: ScopeNode, expr: WhenExpr): Result<boolean> {
    switch (expr.op) {
      case 'true':
        return ok(true);
      case 'context': {
        const value = this.lookup(scope, expr.key);
        if (value === undefined) {
          return err(fail('unknown-context-key', `unknown context key ${expr.key}`, { path: expr.key }));
        }
        if (typeof value !== 'boolean') {
          return err(fail('context-type-mismatch', `context key ${expr.key} is not boolean`, { path: expr.key }));
        }
        return ok(value);
      }
      case 'not': {
        const inner = this.evaluate(scope, expr.item);
        return inner.ok ? ok(!inner.value) : inner;
      }
      case 'and': {
        let result = true;
        for (const item of expr.items) {
          const evaluated = this.evaluate(scope, item);
          if (!evaluated.ok) return evaluated;
          result = result && evaluated.value;
        }
        return ok(result);
      }
      case 'or': {
        let result = false;
        for (const item of expr.items) {
          const evaluated = this.evaluate(scope, item);
          if (!evaluated.ok) return evaluated;
          result = result || evaluated.value;
        }
        return ok(result);
      }
    }
  }
}
