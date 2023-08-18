import {
  DocumentInfo,
  DocumentModelStore,
  IModelCard,
  IReceiverModelCard
} from 'lib/bindings/definitions/IBasicConnectorBinding'
import { ISendFilter, ISenderModelCard } from 'lib/bindings/definitions/ISendBinding'
import { CommitCreateInput } from 'lib/common/generated/gql/graphql'
import {
  useCreateCommit,
  useCreateVersion,
  useGetModelDetails
} from '~/lib/graphql/composables'

export type ProjectModelGroup = {
  projectId: string
  accountId: string
  senders: ISenderModelCard[]
  receivers: IReceiverModelCard[]
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const useHostAppStore = defineStore('hostAppStore', () => {
  const app = useNuxtApp()

  const documentInfo = ref<DocumentInfo>()
  const documentModelStore = ref<DocumentModelStore>({ models: [] })
  const projectModelGroups = computed(() => {
    const projectModelGroups: ProjectModelGroup[] = []
    for (const model of documentModelStore.value.models) {
      let project = projectModelGroups.find((p) => p.projectId === model.projectId)
      if (!project) {
        project = {
          projectId: model.projectId,
          accountId: model.accountId,
          senders: [],
          receivers: []
        }
        projectModelGroups.push(project)
      }
      if (model.typeDiscriminator.toLowerCase().includes('sender'))
        project.senders.push(model as ISenderModelCard)
      if (model.typeDiscriminator.toLowerCase().includes('receiver'))
        project.receivers.push(model as IReceiverModelCard)
    }
    return projectModelGroups
  })

  const sendFilters = ref<ISendFilter[]>()
  const selectionFilter = computed(() =>
    sendFilters.value?.find((f) => f.name === 'Selection')
  )

  const everythingFilter = computed(() =>
    sendFilters.value?.find((f) => f.name === 'Everything')
  )

  const addModel = async (model: IModelCard) => {
    await app.$baseBinding.addModel(model)
    documentModelStore.value.models.push(model)
  }

  const updateModelFilter = async (modelId: string, filter: ISendFilter) => {
    const modelIndex = documentModelStore.value.models.findIndex(
      (m) => m.id === modelId
    )
    const model = documentModelStore.value.models[modelIndex] as ISenderModelCard
    model.sendFilter = filter

    await app.$baseBinding.updateModel(documentModelStore.value.models[modelIndex])
  }

  const removeModel = (modelId: string) => {
    //TODO
    console.log(`Should remove ${modelId}`)
  }

  const sendModel = async (modelId: string) => {
    const model = documentModelStore.value.models.find(
      (m) => m.id === modelId
    ) as ISenderModelCard
    model.expired = false
    model.sending = true
    await app.$sendBinding.send(modelId)
  }

  const sendModelCancel = async (modelId: string) => {
    const model = documentModelStore.value.models.find(
      (m) => m.id === modelId
    ) as ISenderModelCard
    model.sending = false
    model.progress = undefined
    await app.$sendBinding.cancelSend(modelId)
  }

  const refreshDocumentInfo = async () =>
    (documentInfo.value = await app.$baseBinding.getDocumentInfo())

  const refreshDocumentModelStore = async () =>
    (documentModelStore.value = await app.$baseBinding.getDocumentState())

  const refreshSendFilters = async () =>
    (sendFilters.value = await app.$sendBinding?.getSendFilters())

  app.$baseBinding.on(
    'documentChanged',
    () =>
      setTimeout(() => {
        void refreshDocumentInfo()
        void refreshDocumentModelStore()
        void refreshSendFilters()
      }, 500) // timeout exists because of rhino
  )

  app.$sendBinding?.on('filtersNeedRefresh', () => void refreshSendFilters())

  app.$sendBinding?.on('sendersExpired', (senderIds) => {
    documentModelStore.value.models
      .filter((m) => senderIds.includes(m.id))
      .forEach((model) => ((model as ISenderModelCard).expired = true))
  })

  app.$sendBinding.on('senderProgress', (args) => {
    console.log(args)

    const model = documentModelStore.value.models.find(
      (m) => m.id === args.id
    ) as ISenderModelCard
    model.progress = args
    if (args.status === 'Completed') {
      model.sending = false
    }
    console.log(model)
  })

  app.$sendBinding.on('createVersion', async (args) => {
    // const createVersion = useCreateVersion(args.accountId)
    // await createVersion(args)

    const { accountId, modelId, projectId, objectId, message } = args

    const getModelDetails = useGetModelDetails(accountId)
    const modelDetails = getModelDetails({
      projectId,
      modelId
    })

    const branchName = (await modelDetails).displayName

    const commit: CommitCreateInput = {
      streamId: projectId,
      branchName,
      objectId,
      message,
      sourceApplication: (
        await app.$baseBinding.getSourceApplicationName()
      ).toLowerCase()
    }

    const createCommit = useCreateCommit(args.accountId)
    await createCommit(commit)
  })

  // app.$sendBinding?.on('sendViaBrowser', async (sendViaBrowserArgs) => {
  //   const formData = new FormData()
  //   const sendObject = sendViaBrowserArgs.sendObject
  //   const defaultAccount = accountStore.defaultAccount
  //   const modelCard = sendViaBrowserArgs.modelCard

  //   sendObject.batches.forEach(async (batch) => {
  //     formData.append(`batch-1`, new Blob([batch], { type: 'application/json' }))

  //     if (defaultAccount) {
  //       await fetch(
  //         `${defaultAccount.accountInfo.serverInfo.url}/objects/${modelCard.projectId}`,
  //         {
  //           method: 'POST',
  //           headers: { Authorization: 'Bearer ' + defaultAccount.accountInfo.token },
  //           body: formData
  //         }
  //       )
  //     }
  //   })

  //   const getModelDetails = useGetModelDetails()
  //   const modelDetails = getModelDetails({
  //     projectId: modelCard.projectId,
  //     modelId: modelCard.modelId
  //   })

  //   const commit: CommitCreateInput = {
  //     streamId: modelCard.projectId,
  //     branchName: (await modelDetails).displayName,
  //     objectId: sendObject.id,
  //     message: 'sent from sketchup DUI3',
  //     sourceApplication: 'sketchup',
  //     totalChildrenCount: sendObject.totalChildrenCount
  //   }

  //   const createCommit = useCreateCommit()
  //   await createCommit(commit)
  // })

  // First initialization calls
  void refreshDocumentInfo()
  void refreshDocumentModelStore()
  void refreshSendFilters()

  return {
    documentInfo,
    projectModelGroups,
    sendFilters,
    selectionFilter,
    everythingFilter,
    addModel,
    updateModelFilter,
    removeModel,
    sendModel,
    sendModelCancel,
    refreshSendFilters
  }
})
