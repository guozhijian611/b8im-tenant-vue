<!-- 登录页左侧背景 -->
<template>
  <div class="login-left-view">
    <div class="logo">
      <ArtLogo class="icon" size="46" />
      <h1 class="title">{{ siteTitle }}</h1>
    </div>

    <div class="left-img">
      <img :src="loginIllustration" alt="b8im login illustration" />
    </div>

    <div class="text-wrap">
      <h1> {{ $t('login.leftView.title') }} </h1>
      <p> {{ $t('login.leftView.subTitle') }} </p>
      <div class="capability-list">
        <span>{{ $t('login.leftView.points.users') }}</span>
        <span>{{ $t('login.leftView.points.messages') }}</span>
        <span>{{ $t('login.leftView.points.organization') }}</span>
      </div>
    </div>

    <!-- 几何装饰元素 -->
    <div v-if="false" class="geometric-decorations">
      <!-- 基础几何形状 -->
      <div class="geo-element circle-outline animate-fade-in-up" style="animation-delay: 0s"></div>
      <div
        class="geo-element square-rotated animate-fade-in-left"
        style="animation-delay: 0s"
      ></div>
      <div class="geo-element circle-small animate-fade-in-up" style="animation-delay: 0.3s"></div>

      <div
        class="geo-element square-bottom-right animate-fade-in-right"
        style="animation-delay: 0s"
      ></div>

      <!-- 背景泡泡 -->
      <div class="geo-element bg-bubble animate-scale-in" style="animation-delay: 0.5"></div>

      <!-- 太阳/月亮 -->
      <div
        class="geo-element circle-top-right animate-fade-in-down"
        style="animation-delay: 0.5"
        @click="themeAnimation"
      ></div>

      <!-- 装饰点 -->
      <div class="geo-element dot dot-top-left animate-bounce-in" style="animation-delay: 0s"></div>
      <div
        class="geo-element dot dot-top-right animate-bounce-in"
        style="animation-delay: 0s"
      ></div>
      <div
        class="geo-element dot dot-center-right animate-bounce-in"
        style="animation-delay: 0s"
      ></div>

      <!-- 叠加方块组 -->
      <div class="squares-group">
        <i
          class="geo-element square square-blue animate-fade-in-left-rotated-blue"
          style="animation-delay: 0.2s"
        ></i>
        <i
          class="geo-element square square-pink animate-fade-in-left-rotated-pink"
          style="animation-delay: 0.4s"
        ></i>
        <i
          class="geo-element square square-purple animate-fade-in-left-no-rotation"
          style="animation-delay: 0.6s"
        ></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useSiteStore } from '@/store/modules/site'
  import loginIllustration from '@imgs/login/b8im-login-illustration.png'
  import { themeAnimation } from '@/utils/ui/animation'
  const { siteTitle } = storeToRefs(useSiteStore())

  // 定义 props
  defineProps<{
    hideContent?: boolean // 是否隐藏内容，只显示 logo
  }>()
</script>

<style lang="scss" scoped>
  // 颜色变量定义
  $primary-light-7: var(--el-color-primary-light-7);
  $primary-light-8: var(--el-color-primary-light-8);
  $primary-light-9: var(--el-color-primary-light-9);
  $primary-base: var(--el-color-primary);
  $main-bg: var(--default-box-color);

  // 混合颜色函数
  $bg-mix-light-9: color-mix(in srgb, $primary-light-9 100%, $main-bg);
  $bg-mix-light-8: color-mix(in srgb, $primary-light-8 80%, $main-bg);
  $bg-mix-light-7: color-mix(in srgb, $primary-light-7 80%, $main-bg);

  .login-left-view {
    position: relative;
    box-sizing: border-box;
    width: 65vw;
    height: 100%;
    padding: 15px;
    overflow: hidden;
    background:
      var(--login-left-bg, linear-gradient(135deg, #ecfdf5 0%, #f8fffc 48%, #dffbf1 100%)),
      $bg-mix-light-9;

    .logo {
      position: relative;
      z-index: 100;
      display: flex;
      align-items: center;

      .title {
        margin-left: 10px;
        font-size: 20px;
        font-weight: 600;
        color: var(--login-brand-color, #0f3f35);
      }
    }

    .left-img {
      position: absolute;
      top: clamp(120px, 13vh, 168px);
      right: 0;
      left: 0;
      z-index: 10;
      width: min(54%, 680px);
      margin: auto;
      animation: slideInLeft 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;

      img {
        display: block;
        width: 100%;
        height: auto;
        border-radius: 20px;
        mix-blend-mode: var(--login-illustration-blend, multiply);
        filter: saturate(1.02) contrast(1.02);
        box-shadow: 0 18px 48px rgb(15 139 107 / 10%);
      }
    }

    .text-wrap {
      position: absolute;
      bottom: clamp(96px, 12vh, 150px);
      left: 0;
      width: 100%;
      text-align: center;
      animation: slideInLeft 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;

      h1 {
        font-size: 24px;
        font-weight: 400;
        color: var(--art-gray-900) !important;
      }

      p {
        margin-top: 10px;
        font-size: 14px;
        color: var(--art-gray-600) !important;
      }

      .capability-list {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 22px;

        span {
          padding: 7px 12px;
          font-size: 13px;
          color: var(--el-color-primary);
          background-color: color-mix(in srgb, var(--el-color-primary-light-9) 78%, #fff);
          border: 1px solid var(--el-color-primary-light-8);
          border-radius: 8px;
        }
      }
    }

    .geometric-decorations {
      .geo-element {
        position: absolute;
        opacity: 0;
        animation-fill-mode: forwards;
        animation-duration: 0.8s;
        animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      // 动画 mixin
      @mixin fadeAnimation($direction: '', $rotation: 0deg) {
        from {
          opacity: 0;

          @if $direction == 'up' {
            transform: translateY(30px) rotate($rotation);
          } @else if $direction == 'down' {
            transform: translateY(-30px) rotate($rotation);
          } @else if $direction == 'left' {
            transform: translateX(-30px) rotate($rotation);
          } @else if $direction == 'right' {
            transform: translateX(30px) rotate($rotation);
          }
        }

        to {
          opacity: 1;

          @if $direction == 'up' or $direction == 'down' {
            transform: translateY(0) rotate($rotation);
          } @else {
            transform: translateX(0) rotate($rotation);
          }
        }
      }

      // 动画定义
      @keyframes fadeInUp {
        @include fadeAnimation('up');
      }

      @keyframes fadeInDown {
        @include fadeAnimation('down');
      }

      @keyframes fadeInLeft {
        @include fadeAnimation('left');
      }

      @keyframes fadeInLeftRotated {
        @include fadeAnimation('left', -25deg);
      }

      @keyframes fadeInRight {
        @include fadeAnimation('right');
      }

      @keyframes fadeInRightRotated {
        @include fadeAnimation('right', 45deg);
      }

      @keyframes fadeInLeftRotatedBlue {
        @include fadeAnimation('left', -10deg);
      }

      @keyframes fadeInLeftRotatedPink {
        @include fadeAnimation('left', 10deg);
      }

      @keyframes fadeInLeftNoRotation {
        @include fadeAnimation('left');
      }

      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.8);
        }

        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }

        50% {
          opacity: 1;
          transform: scale(1.05);
        }

        70% {
          transform: scale(0.9);
        }

        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes lineGrow {
        from {
          opacity: 0;
        }

        to {
          opacity: 1;
        }
      }

      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }

        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      // 动画类
      .animate-fade-in-up {
        animation-name: fadeInUp;
      }

      .animate-fade-in-down {
        animation-name: fadeInDown;
      }

      .animate-fade-in-left {
        animation-name: fadeInLeft;
      }

      .animate-fade-in-right {
        animation-name: fadeInRight;
      }

      .animate-scale-in {
        animation-name: scaleIn;
        animation-duration: 1.2s;
      }

      .animate-bounce-in {
        animation-name: bounceIn;
        animation-duration: 0.6s;
      }

      .animate-fade-in-left-rotated-blue {
        animation-name: fadeInLeftRotatedBlue;
      }

      .animate-fade-in-left-rotated-pink {
        animation-name: fadeInLeftRotatedPink;
      }

      .animate-fade-in-left-no-rotation {
        animation-name: fadeInLeftNoRotation;
      }

      // 基础几何形状
      .circle-outline {
        top: 10%;
        left: 25%;
        width: 42px;
        height: 42px;
        border: 2px solid $primary-light-8;
        border-radius: 50%;
      }

      .square-rotated {
        top: 50%;
        left: 16%;
        width: 60px;
        height: 60px;
        background-color: $bg-mix-light-8;

        &.animate-fade-in-left {
          animation-name: fadeInLeftRotated;
        }
      }

      .circle-small {
        bottom: 26%;
        left: 30%;
        width: 18px;
        height: 18px;
        background-color: $primary-light-8;
        border-radius: 50%;
      }

      // 太阳/月亮效果
      .circle-top-right {
        top: 3%;
        right: 3%;
        z-index: 100;
        width: 50px;
        height: 50px;
        cursor: pointer;
        background: $bg-mix-light-7;
        border-radius: 50%;
        transition: all 0.3s;

        &::after {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          content: '';
          background: linear-gradient(to right, #fcbb04, #fffc00);
          border-radius: 50%;
          opacity: 0;
          transition: all 0.5s;
          transform: translate(-50%, -50%);
        }

        &:hover {
          box-shadow: 0 0 36px #fffc00;

          &::after {
            opacity: 1;
          }
        }
      }

      .square-bottom-right {
        right: 10%;
        bottom: 10%;
        width: 50px;
        height: 50px;
        background-color: $primary-light-8;

        &.animate-fade-in-right {
          animation-name: fadeInRightRotated;
        }
      }

      // 背景泡泡
      .bg-bubble {
        top: -120px;
        right: -120px;
        width: 360px;
        height: 360px;
        background-color: $bg-mix-light-8;
        border-radius: 50%;
      }

      // 装饰点
      .dot {
        width: 14px;
        height: 14px;
        background-color: $primary-light-7;
        border-radius: 50%;

        &.dot-top-left {
          top: 140px;
          left: 100px;
        }

        &.dot-top-right {
          top: 140px;
          right: 120px;
        }

        &.dot-center-right {
          top: 46%;
          right: 22%;
          background-color: $primary-light-8;
        }
      }

      // 叠加方块组
      .squares-group {
        position: absolute;
        bottom: 18px;
        left: 20px;
        width: 140px;
        height: 140px;
        pointer-events: none;

        .square {
          position: absolute;
          display: block;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgb(64 87 167 / 12%);

          &.square-blue {
            top: 12px;
            left: 30px;
            z-index: 2;
            width: 50px;
            height: 50px;
            background-color: rgb(from $primary-base r g b / 30%);
          }

          &.square-pink {
            top: 30px;
            left: 48px;
            z-index: 1;
            width: 70px;
            height: 70px;
            background-color: rgb(from $primary-base r g b / 15%);
          }

          &.square-purple {
            top: 66px;
            left: 86px;
            z-index: 3;
            width: 32px;
            height: 32px;
            background-color: rgb(from $primary-base r g b / 45%);
          }
        }

        // 装饰线条
        &::after {
          position: absolute;
          top: 86px;
          left: 72px;
          width: 80px;
          height: 1px;
          content: '';
          background: linear-gradient(90deg, var(--el-color-primary-light-6), transparent);
          opacity: 0;
          transform: rotate(50deg);
          animation: lineGrow 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          animation-delay: 1.2s;
        }
      }
    }

    @media only screen and (width <= 1600px) {
      width: 62vw;

      .left-img {
        top: clamp(112px, 12vh, 150px);
        width: min(64%, 620px);
      }

      .text-wrap {
        bottom: clamp(120px, 14vh, 170px);
      }
    }

    @media only screen and (width <= 1180px) {
      width: auto;
      height: auto;
      padding: 0;
      // 隐藏背景和其他内容，只保留 logo
      background: transparent;

      .left-img,
      .text-wrap,
      .geometric-decorations {
        display: none;
      }

      .logo {
        display: none;
      }
    }
  }
</style>
