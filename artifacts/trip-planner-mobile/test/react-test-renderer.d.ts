declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestInstance {
    children: Array<ReactTestInstance | string>;
    props: Record<string, any>;
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