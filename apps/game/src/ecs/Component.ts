export type ComponentStore<TComponent> = Map<number, TComponent>;

export type ComponentClass<TComponent> = {
  new (...args: never[]): TComponent;
};
