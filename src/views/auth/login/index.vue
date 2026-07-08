<!-- 登录页面 -->
<template>
  <div class="login-page flex w-full h-screen">
    <LoginLeftView />

    <div class="login-form-side relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <div class="entry-badge">{{ $t('login.entryLabel') }}</div>
          <h3 class="title">{{ $t('login.title') }}</h3>
          <p class="sub-title">{{ $t('login.subTitle') }}</p>
          <ElForm
            ref="formRef"
            :model="formData"
            :rules="rules"
            :key="formKey"
            @keyup.enter="handleSubmit"
            style="margin-top: 30px"
          >
            <ElFormItem v-if="requiresEnterpriseCode" prop="enterpriseCode">
              <ElInput
                class="custom-height"
                :placeholder="$t('login.placeholder.enterpriseCode')"
                v-model.trim="formData.enterpriseCode"
                :disabled="siteLoading || loading"
                @blur="handleEnterpriseCodeBlur"
              />
            </ElFormItem>
            <ElFormItem prop="username">
              <ElInput
                class="custom-height"
                :placeholder="$t('login.placeholder.username')"
                v-model.trim="formData.username"
              />
            </ElFormItem>
            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                :placeholder="$t('login.placeholder.password')"
                v-model.trim="formData.password"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>
            <ElFormItem prop="code">
              <ElInput
                class="custom-height"
                :placeholder="$t('login.placeholder.code')"
                v-model.trim="formData.code"
                type="text"
                autocomplete="off"
              >
                <template #append>
                  <img
                    :src="captcha"
                    style="height: 36px; cursor: pointer"
                    @click="refreshCaptcha"
                  />
                </template>
              </ElInput>
            </ElFormItem>

            <div class="flex-cb mt-2 text-sm">
              <ElCheckbox v-model="formData.rememberPassword">{{
                $t('login.rememberPwd')
              }}</ElCheckbox>
              <!-- <RouterLink class="text-theme" :to="{ name: 'ForgetPassword' }">{{
                $t('login.forgetPwd')
              }}</RouterLink> -->
            </div>

            <div style="margin-top: 30px">
              <ElButton
                class="w-full custom-height"
                type="primary"
                @click="handleSubmit"
                :loading="loading"
                v-ripple
              >
                {{ $t('login.btnText') }}
              </ElButton>
            </div>

            <!-- <div class="mt-5 text-sm text-gray-600">
              <span>{{ $t('login.noAccount') }}</span>
              <RouterLink class="text-theme" :to="{ name: 'Register' }">{{
                $t('login.register')
              }}</RouterLink>
            </div> -->
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useUserStore } from '@/store/modules/user'
  import { useSiteStore } from '@/store/modules/site'
  import { useI18n } from 'vue-i18n'
  import { HttpError } from '@/utils/http/error'
  import { fetchCaptcha, fetchLogin, fetchGetUserInfo } from '@/api/auth'
  import { ElNotification, type FormInstance, type FormRules } from 'element-plus'
  import { isNavigationFailure } from 'vue-router'
  import { loadingService } from '@/utils/ui/loading'

  defineOptions({ name: 'Login' })

  const { t, locale } = useI18n()
  const formKey = ref(0)

  // 监听语言切换，重置表单
  watch(locale, () => {
    formKey.value++
  })

  const userStore = useUserStore()
  const siteStore = useSiteStore()
  const router = useRouter()
  const route = useRoute()
  const appMode = import.meta.env.VITE_APP_MODE || 'enterprise_code'
  const requiresEnterpriseCode = computed(() => appMode !== 'domain')

  const captcha = ref(
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  )

  const formRef = ref<FormInstance>()

  const formData = reactive({
    enterpriseCode: '',
    username: '',
    password: '',
    code: '',
    uuid: '',
    rememberPassword: true
  })

  const rules = computed<FormRules>(() => ({
    enterpriseCode: requiresEnterpriseCode.value
      ? [
          {
            required: true,
            message: t('login.placeholder.enterpriseCode'),
            trigger: 'blur'
          }
        ]
      : [],
    username: [{ required: true, message: t('login.placeholder.username'), trigger: 'blur' }],
    password: [{ required: true, message: t('login.placeholder.password'), trigger: 'blur' }],
    code: [{ required: true, message: t('login.placeholder.code'), trigger: 'blur' }]
  }))

  const loading = ref(false)
  const siteLoading = ref(false)

  onMounted(() => {
    syncEnterpriseCodeInput()
    refreshCaptcha()
  })

  watch(
    () => [route.query.enterprise_code, siteStore.params.enterprise_code],
    () => {
      syncEnterpriseCodeInput()
    }
  )

  // 登录
  const handleSubmit = async () => {
    if (!formRef.value) return

    let isNavigatingAway = false
    let closeRouteLoading: (() => void) | null = null

    try {
      // 表单验证
      const valid = await formRef.value.validate()
      if (!valid) return

      loading.value = true
      await resolveEnterpriseCode()

      // 登录请求
      const { access_token, refresh_token } = await fetchLogin({
        username: formData.username,
        password: formData.password,
        code: formData.code,
        uuid: formData.uuid
      })

      // 验证token
      if (!access_token) {
        throw new Error('Login failed - no token received')
      }

      // 存储token和用户信息
      userStore.setToken(access_token, refresh_token)
      closeRouteLoading = loadingService.showLoading()
      const userInfo = await fetchGetUserInfo()
      userStore.setUserInfo(userInfo)
      userStore.setLoginStatus(true)

      // 登录成功处理
      showLoginSuccessNotice()
      const navigationFailure = await router.push('/')
      if (navigationFailure && isNavigationFailure(navigationFailure)) {
        throw navigationFailure
      }
      isNavigatingAway = true
    } catch (error) {
      // 处理 HttpError
      if (error instanceof HttpError) {
        // console.log(error.code)
      } else {
        // 处理非 HttpError
        // ElMessage.error('登录失败，请稍后重试')
        console.error('[Login] Unexpected error:', error)
      }
    } finally {
      closeRouteLoading?.()

      if (!isNavigatingAway) {
        refreshCaptcha()
        loading.value = false
      }
    }
  }

  // 获取验证码
  const refreshCaptcha = async () => {
    fetchCaptcha().then((res) => {
      formData.uuid = res.uuid
      captcha.value = res.image
    })
  }

  const getRouteEnterpriseCode = () => {
    const enterpriseCode = route.query.enterprise_code
    return Array.isArray(enterpriseCode)
      ? enterpriseCode[0] || ''
      : String(enterpriseCode || '')
  }

  const getStoredEnterpriseCode = () =>
    siteStore.params.enterprise_code ||
    (siteStore.info.enterprise_code ? String(siteStore.info.enterprise_code) : '')

  const syncEnterpriseCodeInput = () => {
    if (!requiresEnterpriseCode.value) {
      return
    }
    const enterpriseCode = getRouteEnterpriseCode() || getStoredEnterpriseCode()
    if (enterpriseCode && formData.enterpriseCode !== enterpriseCode) {
      formData.enterpriseCode = enterpriseCode
    }
  }

  const replaceEnterpriseCodeQuery = async (enterpriseCode: string) => {
    if (route.query.enterprise_code === enterpriseCode) {
      return
    }

    const nextQuery = { ...route.query, enterprise_code: enterpriseCode }
    await router.replace({
      path: route.path,
      query: nextQuery,
      hash: route.hash
    })
  }

  const resolveEnterpriseCode = async () => {
    if (!requiresEnterpriseCode.value) {
      return
    }

    const enterpriseCode = formData.enterpriseCode.trim()
    formData.enterpriseCode = enterpriseCode
    if (!enterpriseCode) {
      return
    }

    const isResolved =
      siteStore.loaded &&
      Boolean(siteStore.info.id) &&
      siteStore.params.enterprise_code === enterpriseCode

    if (!isResolved) {
      await siteStore.loadSiteInfo(true, enterpriseCode)
    }
    await replaceEnterpriseCodeQuery(enterpriseCode)
  }

  const handleEnterpriseCodeBlur = async () => {
    if (!requiresEnterpriseCode.value || !formData.enterpriseCode.trim()) {
      return
    }

    try {
      siteLoading.value = true
      await resolveEnterpriseCode()
    } catch {
      // request 统一错误提示已处理，这里只避免 blur 触发未捕获异常。
    } finally {
      siteLoading.value = false
    }
  }

  // 登录成功提示
  const showLoginSuccessNotice = () => {
    setTimeout(() => {
      ElNotification({
        title: t('login.success.title'),
        type: 'success',
        duration: 2500,
        zIndex: 10000,
        message: `${t('login.success.message')}, ${formData.username}!`
      })
    }, 150)
  }
</script>

<style scoped>
  @import './style.css';
</style>

<style lang="scss" scoped>
  :deep(.el-select__wrapper) {
    height: 40px !important;
  }
</style>
