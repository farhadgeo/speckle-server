<template>
  <LayoutDialog v-model:open="open" max-width="sm" :buttons="dialogButtons">
    <template #header>Create a new project</template>
    <form class="flex flex-col text-foreground" @submit="onSubmit">
      <div class="flex flex-col gap-y-4 mb-2">
        <FormTextInput
          name="name"
          label="Project name"
          placeholder="Name"
          color="foundation"
          :rules="[isRequired, isStringOfLength({ maxLength: 512 })]"
          auto-focus
          autocomplete="off"
          show-label
        />
        <FormTextArea
          name="description"
          label="Project description"
          placeholder="Description"
          color="foundation"
          size="lg"
          show-label
          show-optional
          :rules="[isStringOfLength({ maxLength: 65536 })]"
        />
        <div>
          <h3 class="label mb-2">Access permissions</h3>
          <ProjectVisibilitySelect v-model="visibility" mount-menu-on-body />
        </div>
        <template v-if="isWorkspacesEnabled && !workspaceId">
          <div v-if="!isCreatingWorkspace" class="flex gap-y-2 flex-col">
            <p class="text-body-xs text-foreground font-medium">Workspace</p>
            <div v-if="hasWorkspaces">
              <div class="flex gap-x-2 items-center">
                <ProjectsWorkspaceSelect
                  v-model="selectedWorkspace"
                  :items="workspaces"
                  class="flex-1"
                />
                <FormButton
                  :icon-left="PlusIcon"
                  hide-text
                  class="flex"
                  color="outline"
                  @click="isCreatingWorkspace = true"
                />
              </div>
            </div>
            <FormButton v-else color="outline" @click="isCreatingWorkspace = true">
              New workspace
            </FormButton>
            <p class="text-foreground-2 text-body-2xs">
              Workspace offers better project management and higher data security.
            </p>
          </div>
          <ProjectsAddDialogNewWorkspace
            v-if="isCreatingWorkspace"
            @cancel="isCreatingWorkspace = false"
            @workspace-created="onWorkspaceCreated"
          />
        </template>
      </div>
    </form>
  </LayoutDialog>
</template>
<script setup lang="ts">
import type { LayoutDialogButton } from '@speckle/ui-components'
import { useForm } from 'vee-validate'
import { ProjectVisibility } from '~~/lib/common/generated/gql/graphql'
import { isRequired, isStringOfLength } from '~~/lib/common/helpers/validation'
import { useMixpanel } from '~~/lib/core/composables/mp'
import { useCreateProject } from '~~/lib/projects/composables/projectManagement'
import { useIsWorkspacesEnabled } from '~/composables/globals'
import { PlusIcon } from '@heroicons/vue/24/outline'
import type { ProjectsAddDialog_WorkspaceFragment } from '~/lib/common/generated/gql/graphql'
import { graphql } from '~~/lib/common/generated/gql'
import { projectWorkspaceSelectQuery } from '~/lib/projects/graphql/queries'
import { useQuery } from '@vue/apollo-composable'

graphql(`
  fragment ProjectsAddDialog_Workspace on Workspace {
    id
    role
    name
    defaultLogoIndex
    logo
  }
`)

graphql(`
  fragment ProjectsAddDialog_User on User {
    workspaces {
      items {
        ...ProjectsAddDialog_Workspace
      }
    }
  }
`)

type FormValues = {
  name: string
  description?: string
}

const props = defineProps<{
  workspaceId?: string
}>()

const emit = defineEmits<{
  (e: 'created'): void
}>()

const isWorkspacesEnabled = useIsWorkspacesEnabled()
const createProject = useCreateProject()
const { handleSubmit } = useForm<FormValues>()
const { result: workspaceResult } = useQuery(projectWorkspaceSelectQuery, null, () => ({
  enabled: isWorkspacesEnabled.value
}))

const visibility = ref(ProjectVisibility.Unlisted)
const selectedWorkspace = ref<ProjectsAddDialog_WorkspaceFragment>()
const isCreatingWorkspace = ref<boolean>(false)

const open = defineModel<boolean>('open', { required: true })

const mp = useMixpanel()

const onWorkspaceCreated = (workspace: ProjectsAddDialog_WorkspaceFragment) => {
  isCreatingWorkspace.value = false
  selectedWorkspace.value = workspace
}

const onSubmit = handleSubmit(async (values) => {
  await createProject({
    name: values.name,
    description: values.description,
    visibility: visibility.value,
    workspaceId: props.workspaceId || selectedWorkspace.value?.id
  })
  emit('created')
  mp.track('Stream Action', {
    type: 'action',
    name: 'create',
    // eslint-disable-next-line camelcase
    workspace_id: props.workspaceId
  })
  open.value = false
})

const workspaces = computed(
  () => workspaceResult.value?.activeUser?.workspaces.items ?? []
)
const hasWorkspaces = computed(() => workspaces.value.length > 0)
const dialogButtons = computed((): LayoutDialogButton[] => [
  {
    text: 'Cancel',
    props: { color: 'outline' },
    onClick: () => {
      open.value = false
    }
  },
  {
    text: 'Create',
    props: {
      submit: true
    },
    onClick: onSubmit
  }
])

watch(open, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    selectedWorkspace.value = undefined
  }
})
</script>
