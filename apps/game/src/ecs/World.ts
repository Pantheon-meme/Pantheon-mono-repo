import type { ComponentClass, ComponentStore } from "./Component";
import type { System } from "./System";

export type Entity = number;

export class World {
  private nextEntity = 1;
  private readonly components = new Map<Function, ComponentStore<unknown>>();
  private readonly systems: System[] = [];

  createEntity(): Entity {
    const entity = this.nextEntity;
    this.nextEntity += 1;
    return entity;
  }

  addComponent<TComponent>(
    entity: Entity,
    componentClass: ComponentClass<TComponent>,
    component: TComponent,
  ): void {
    this.getStore(componentClass).set(entity, component);
  }

  getComponent<TComponent>(
    entity: Entity,
    componentClass: ComponentClass<TComponent>,
  ): TComponent | undefined {
    return this.getStore(componentClass).get(entity);
  }

  query<TA>(a: ComponentClass<TA>): Array<[Entity, TA]>;
  query<TA, TB>(
    a: ComponentClass<TA>,
    b: ComponentClass<TB>,
  ): Array<[Entity, TA, TB]>;
  query<TA, TB, TC>(
    a: ComponentClass<TA>,
    b: ComponentClass<TB>,
    c: ComponentClass<TC>,
  ): Array<[Entity, TA, TB, TC]>;
  query(...componentClasses: ComponentClass<unknown>[]): unknown[][] {
    const [primaryClass, ...restClasses] = componentClasses;
    if (!primaryClass) {
      return [];
    }

    const primaryStore = this.getStore(primaryClass);
    const restStores = restClasses.map((componentClass) =>
      this.getStore(componentClass),
    );

    const matches: unknown[][] = [];

    for (const [entity, primaryComponent] of primaryStore.entries()) {
      const restComponents = restStores.map((store) => store.get(entity));
      if (restComponents.every((component) => component !== undefined)) {
        matches.push([entity, primaryComponent, ...restComponents]);
      }
    }

    return matches;
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  update(deltaSeconds: number): void {
    for (const system of this.systems) {
      system.update(this, deltaSeconds);
    }
  }

  private getStore<TComponent>(
    componentClass: ComponentClass<TComponent>,
  ): ComponentStore<TComponent> {
    let store = this.components.get(componentClass) as
      | ComponentStore<TComponent>
      | undefined;

    if (!store) {
      store = new Map<number, TComponent>();
      this.components.set(componentClass, store as ComponentStore<unknown>);
    }

    return store;
  }
}
