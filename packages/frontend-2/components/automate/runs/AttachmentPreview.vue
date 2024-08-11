<template>
  <img :src="url" />
</template>

<script setup lang="ts">
import { useFileDownload } from '~~/lib/core/composables/fileUpload'
import { useInjectedViewerState } from '~/lib/viewer/composables/setup'

const { getBlobUrl } = useFileDownload()
const { projectId } = useInjectedViewerState()

const props = defineProps<{
  blobId: string
}>()

const url = ref<string>()

watch(
  props,
  () => {
    getBlobUrl({ blobId: props.blobId, projectId: projectId.value }).then((res) => {
      url.value = res
    })
  },
  {
    immediate: true
  }
)
</script>
