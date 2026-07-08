<template>
  <div class="art-full-height">
    <ElTabs v-model="activeName" class="art-card-xs flex flex-col h-full p-4">
      <ElTabPane name="1" label="基础设置">
        <div class="art-card-sm p-4">
          <ElForm ref="formRef" :model="formData" :rules="rules" label-width="140px">
            <ElFormItem label="站点标题" prop="title">
              <ElInput v-model="formData.title" placeholder="请输入站点标题" />
            </ElFormItem>
            <ElFormItem label="站点Logo" prop="logo">
              <SaImagePicker v-model="formData.logo" />
            </ElFormItem>
            <ElFormItem label="机构名称" prop="organization_name">
              <ElInput v-model="formData.organization_name" placeholder="请输入机构名称" />
            </ElFormItem>
            <ElFormItem label="地区" prop="region">
              <SaArea v-model="formData.region" :level="3" placeholder="请输入地区" />
            </ElFormItem>
            <ElFormItem label="详细地址" prop="address">
              <ElInput v-model="formData.address" placeholder="请输入详细地址" />
            </ElFormItem>
            <ElFormItem label="联系人" prop="contact_name">
              <ElInput v-model="formData.contact_name" placeholder="请输入联系人" />
            </ElFormItem>
            <ElFormItem label="联系电话" prop="contact_phone">
              <ElInput v-model="formData.contact_phone" placeholder="请输入联系电话" />
            </ElFormItem>
            <ElFormItem label="联系邮箱" prop="contact_email">
              <ElInput v-model="formData.contact_email" placeholder="请输入联系邮箱" />
            </ElFormItem>
            <ElFormItem label="备注" prop="remark">
              <ElInput v-model="formData.remark" type="textarea" placeholder="请输入备注" />
            </ElFormItem>
            <ElFormItem>
              <ElButton
                type="primary"
                v-permission="'saimulti:tenant:config:save'"
                @click="handleSubmit"
                >保存</ElButton
              >
            </ElFormItem>
          </ElForm>
        </div>
      </ElTabPane>

      <ElTabPane
        v-for="element in groupData"
        :key="element.id"
        :name="element.name"
        :label="element.name"
      >
        <div class="art-card-sm p-4">
          <ElForm label-width="140px">
            <template v-for="item in element.data" :key="item.id">
              <ElFormItem :label="item.name" :prop="item.key">
                <ElSelect
                  v-if="item.input_type === 'select'"
                  v-model="item.value"
                  :options="item.config_select_data"
                  :placeholder="'请选择' + item.name"
                />
                <ElInput
                  v-if="item.input_type === 'input'"
                  v-model="item.value"
                  :placeholder="'请输入' + item.name"
                />
                <ElRadioGroup
                  v-if="item.input_type === 'radio'"
                  v-model="item.value"
                  :options="item.config_select_data"
                />
                <ElInput
                  v-if="item.input_type === 'textarea'"
                  v-model="item.value"
                  type="textarea"
                  :placeholder="'请输入' + item.name"
                />
                <SaImageUpload v-if="item.input_type === 'uploadImage'" v-model="item.value" />
                <SaFileUpload v-if="item.input_type === 'uploadFile'" v-model="item.value" />
                <SaEditor v-if="item.input_type === 'wangEditor'" v-model="item.value" />
              </ElFormItem>
            </template>
            <ElFormItem v-if="element.data.length > 0">
              <ElButton
                type="primary"
                v-permission="'saimulti:tenant:config:save'"
                @click="submit(element)"
                >保存</ElButton
              >
            </ElFormItem>
          </ElForm>
        </div>
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<script setup lang="ts">
  import api from '@/api/system/config'
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import { loadingService } from '@/utils/ui/loading'
  import { toRaw } from 'vue'

  const formRef = ref<FormInstance>()
  const groupData = ref<any[]>([])
  const activeName = ref('1')

  const formData = reactive({
    id: '',
    title: '',
    logo: '',
    region: [] as Array<string | number>,
    province: '',
    city: '',
    area: '',
    address: '',
    remark: '',
    organization_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: ''
  })

  const setFormData = (data: Record<string, any>) => {
    const form = formData as Record<string, any>
    for (const key in formData) {
      if (data[key] !== null && data[key] !== undefined) {
        form[key] = data[key]
      }
    }

    if (!Array.isArray(data.region) && (data.province || data.city || data.area)) {
      formData.region = [data.province, data.city, data.area].filter(Boolean)
    }
  }

  const rules = reactive<FormRules>({
    title: [{ required: true, message: '请输入站点标题', trigger: 'blur' }],
    logo: [{ required: true, message: '请上传站点logo', trigger: 'change' }],
    organization_name: [{ required: true, message: '请输入机构名称', trigger: 'blur' }]
  })

  const handleSubmit = async () => {
    if (!formRef.value) return
    try {
      await formRef.value.validate()
      loadingService.showLoading()
      await api.saveBasic({
        ...toRaw(formData),
        region: [...formData.region]
      })
      ElMessage.success('保存成功')
    } catch (error) {
      console.log('表单保存失败:', error)
    } finally {
      loadingService.hideLoading()
    }
  }

  const submit = async (element: Record<string, any>) => {
    try {
      loadingService.showLoading()
      await api.saveGroup(toRaw(element))
      ElMessage.success('保存成功')
    } catch (error) {
      console.log('配置保存失败:', error)
    } finally {
      loadingService.hideLoading()
    }
  }

  onMounted(async () => {
    const resp = await api.basic()
    setFormData(resp as Record<string, any>)
    const resp2 = await api.groupConfig()
    groupData.value = resp2 as any[]
  })
</script>
