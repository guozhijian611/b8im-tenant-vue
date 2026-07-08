import mitt, { type Emitter } from 'mitt'

type Events = {
  openSetting: void
}

const mittBus: Emitter<Events> = mitt<Events>()

export default mittBus
