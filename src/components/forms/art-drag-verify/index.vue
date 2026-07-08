<!-- 拖拽验证组件 -->
<template>
  <div
    ref="dragVerify"
    class="drag_verify"
    :style="dragVerifyStyle"
    @mousemove="dragMoving"
    @mouseup="dragFinish"
    @mouseleave="dragFinish"
  >
    <div
      ref="progressBar"
      class="dv_progress_bar"
      :class="{ goFirst2: isOk }"
      :style="progressBarStyle"
    />

    <div ref="messageRef" class="dv_text" :style="textStyle">
      <slot v-if="$slots.textBefore" name="textBefore" />
      {{ message }}
      <slot v-if="$slots.textAfter" name="textAfter" />
    </div>

    <div
      ref="handler"
      class="dv_handler dv_handler_bg"
      :class="{ goFirst: isOk }"
      :style="handlerStyle"
      @mousedown="dragStart"
      @touchstart="dragStart"
    >
      <ArtSvgIcon :icon="value ? successIcon : handlerIcon" class="text-g-600" />
    </div>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ArtDragVerify' })

  const emit = defineEmits(['handlerMove', 'update:value', 'passCallback'])

  interface PropsType {
    value: boolean
    width?: number | string
    height?: number
    text?: string
    successText?: string
    background?: string
    progressBarBg?: string
    completedBg?: string
    circle?: boolean
    radius?: string
    handlerIcon?: string
    successIcon?: string
    handlerBg?: string
    textSize?: string
    textColor?: string
  }

  const props = withDefaults(defineProps<PropsType>(), {
    value: false,
    width: '100%',
    height: 40,
    text: '按住滑块拖动',
    successText: 'success',
    background: '#eee',
    progressBarBg: '#1385FF',
    completedBg: '#57D187',
    circle: false,
    radius: 'calc(var(--custom-radius) / 3 + 2px)',
    handlerIcon: 'solar:double-alt-arrow-right-linear',
    successIcon: 'ri:check-fill',
    handlerBg: '#fff',
    textSize: '13px',
    textColor: '#333'
  })

  interface StateType {
    isMoving: boolean
    x: number
    isOk: boolean
  }

  const state = reactive<StateType>({
    isMoving: false,
    x: 0,
    isOk: false
  })

  const { isOk } = toRefs(state)

  const dragVerify = ref<HTMLElement>()
  const messageRef = ref<HTMLElement>()
  const handler = ref<HTMLElement>()
  const progressBar = ref<HTMLElement>()

  let startX = 0
  let startY = 0
  let moveX = 0
  let moveY = 0
  let touchListenersRegistered = false

  const getPointerPageX = (event: MouseEvent | TouchEvent) => {
    if ('touches' in event && event.touches.length > 0) {
      return event.touches[0].pageX
    }

    if ('changedTouches' in event && event.changedTouches.length > 0) {
      return event.changedTouches[0].pageX
    }

    return (event as MouseEvent).pageX
  }

  const recordTouchStart = (event: TouchEvent) => {
    if (!event.targetTouches.length) return

    startX = event.targetTouches[0].pageX
    startY = event.targetTouches[0].pageY
  }

  const onDocumentTouchMove = (event: TouchEvent) => {
    if (!state.isMoving || !event.targetTouches.length) return

    moveX = event.targetTouches[0].pageX
    moveY = event.targetTouches[0].pageY

    if (Math.abs(moveX - startX) > Math.abs(moveY - startY)) {
      event.preventDefault()
    }

    dragMoving(event)
  }

  const registerTouchListeners = () => {
    if (touchListenersRegistered) return

    document.addEventListener('touchmove', onDocumentTouchMove, { passive: false })
    document.addEventListener('touchend', dragFinish)
    touchListenersRegistered = true
  }

  const unregisterTouchListeners = () => {
    if (!touchListenersRegistered) return

    document.removeEventListener('touchmove', onDocumentTouchMove)
    document.removeEventListener('touchend', dragFinish)
    touchListenersRegistered = false
  }

  const getNumericWidth = (): number => {
    if (typeof props.width === 'string') {
      return dragVerify.value?.offsetWidth || 260
    }

    return props.width
  }

  const getStyleWidth = (): string => {
    if (typeof props.width === 'string') {
      return props.width
    }

    return `${props.width}px`
  }

  onMounted(() => {
    dragVerify.value?.style.setProperty('--textColor', props.textColor)

    nextTick(() => {
      const numericWidth = getNumericWidth()
      dragVerify.value?.style.setProperty('--width', `${Math.floor(numericWidth / 2)}px`)
      dragVerify.value?.style.setProperty('--pwidth', `${-Math.floor(numericWidth / 2)}px`)
    })
  })

  onBeforeUnmount(() => {
    unregisterTouchListeners()
  })

  const handlerStyle = {
    left: '0',
    width: `${props.height}px`,
    height: `${props.height}px`,
    background: props.handlerBg
  }

  const dragVerifyStyle = computed(() => ({
    width: getStyleWidth(),
    height: `${props.height}px`,
    lineHeight: `${props.height}px`,
    background: props.background,
    borderRadius: props.circle ? `${props.height / 2}px` : props.radius
  }))

  const progressBarStyle = {
    background: props.progressBarBg,
    height: `${props.height}px`,
    borderRadius: props.circle ? `${props.height / 2}px 0 0 ${props.height / 2}px` : props.radius
  }

  const textStyle = computed(() => ({
    fontSize: props.textSize
  }))

  const message = computed(() => {
    return props.value ? props.successText : props.text
  })

  const dragStart = (event: MouseEvent | TouchEvent) => {
    if (props.value || !handler.value) return

    state.isMoving = true
    handler.value.style.transition = 'none'

    if ('touches' in event && event.touches.length > 0) {
      recordTouchStart(event)
      registerTouchListeners()
    }

    state.x = getPointerPageX(event) - parseInt(handler.value.style.left.replace('px', ''), 10)
    emit('handlerMove')
  }

  const dragMoving = (event: MouseEvent | TouchEvent) => {
    if (!state.isMoving || props.value || !handler.value || !progressBar.value) return

    const numericWidth = getNumericWidth()
    const currentX = getPointerPageX(event) - state.x

    if (currentX > 0 && currentX <= numericWidth - props.height) {
      handler.value.style.left = `${currentX}px`
      progressBar.value.style.width = `${currentX + props.height / 2}px`
    } else if (currentX > numericWidth - props.height) {
      handler.value.style.left = `${numericWidth - props.height}px`
      progressBar.value.style.width = `${numericWidth - props.height / 2}px`
      passVerify()
    }
  }

  const dragFinish = (event: MouseEvent | TouchEvent) => {
    if (!state.isMoving || props.value || !handler.value || !progressBar.value) {
      unregisterTouchListeners()
      return
    }

    const numericWidth = getNumericWidth()
    const currentX = getPointerPageX(event) - state.x

    if (currentX < numericWidth - props.height) {
      state.isOk = true
      handler.value.style.left = '0'
      handler.value.style.transition = 'all 0.2s'
      progressBar.value.style.width = '0'
      state.isOk = false
    } else {
      handler.value.style.transition = 'none'
      handler.value.style.left = `${numericWidth - props.height}px`
      progressBar.value.style.width = `${numericWidth - props.height / 2}px`
      passVerify()
    }

    state.isMoving = false
    unregisterTouchListeners()
  }

  const passVerify = () => {
    if (!progressBar.value || !messageRef.value) return

    emit('update:value', true)
    state.isMoving = false
    unregisterTouchListeners()

    progressBar.value.style.background = props.completedBg
    messageRef.value.style.setProperty('-webkit-text-fill-color', 'unset')
    messageRef.value.style.animation = 'slidetounlock2 2s cubic-bezier(0, 0.2, 1, 1) infinite'
    messageRef.value.style.color = '#fff'
    emit('passCallback')
  }

  const reset = () => {
    if (!handler.value || !progressBar.value || !messageRef.value) return

    handler.value.style.left = '0'
    progressBar.value.style.width = '0'
    progressBar.value.style.background = props.progressBarBg
    messageRef.value.style.setProperty('-webkit-text-fill-color', 'transparent')
    messageRef.value.style.animation = 'slidetounlock 2s cubic-bezier(0, 0.2, 1, 1) infinite'
    messageRef.value.style.color = props.background

    emit('update:value', false)
    state.isOk = false
    state.isMoving = false
    state.x = 0
    unregisterTouchListeners()
  }

  defineExpose({
    reset
  })
</script>

<style lang="scss" scoped>
  .drag_verify {
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
    text-align: center;
    border: 1px solid var(--default-border-dashed);

    .dv_handler {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: move;

      i {
        padding-left: 0;
        font-size: 14px;
        color: #999;
      }

      .el-icon-circle-check {
        margin-top: 9px;
        color: #6c6;
      }
    }

    .dv_progress_bar {
      position: absolute;
      width: 0;
      height: 34px;
    }

    .dv_text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: transparent;
      user-select: none;
      background: linear-gradient(
        to right,
        var(--textColor) 0%,
        var(--textColor) 40%,
        #fff 50%,
        var(--textColor) 60%,
        var(--textColor) 100%
      );
      -webkit-background-clip: text;
      background-clip: text;
      animation: slidetounlock 2s cubic-bezier(0, 0.2, 1, 1) infinite;
      -webkit-text-fill-color: transparent;
      text-size-adjust: none;

      * {
        -webkit-text-fill-color: var(--textColor);
      }
    }
  }

  .goFirst {
    left: 0 !important;
    transition: left 0.5s;
  }

  .goFirst2 {
    width: 0 !important;
    transition: width 0.5s;
  }
</style>

<style lang="scss">
  @keyframes slidetounlock {
    0% {
      background-position: var(--pwidth) 0;
    }

    100% {
      background-position: var(--width) 0;
    }
  }

  @keyframes slidetounlock2 {
    0% {
      background-position: var(--pwidth) 0;
    }

    100% {
      background-position: var(--pwidth) 0;
    }
  }
</style>
