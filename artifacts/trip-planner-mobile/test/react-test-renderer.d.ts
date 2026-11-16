declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestInstance {
    children: Array<ReactTestInstance | string>;
    props: Record<string, any>;
    type: unknown;
    findAll(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[];
    findAllByProps(props: Record<string, unknown>): ReactTestInstance[];
    findByProps(props: Record<string, unknown>): ReactTestInstance;
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    unmount(): void;
  }

  export function act(callback: () => void | Promise<void>): void | Promise<void>;
  export function create(element: ReactElement): ReactTestRenderer;
}