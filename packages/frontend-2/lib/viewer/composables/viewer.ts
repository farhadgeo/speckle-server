import { Viewer, DefaultViewerParams } from '@speckle/viewer'
import { inject, InjectionKey, Ref, ref, provide } from 'vue'

// Keys you can use in the Viewer family of components to inject the viewer, its container and its init state
export const ViewerKey: InjectionKey<Viewer> = Symbol('VIEWER_INSTANCE')
export const ViewerInitializedKey: InjectionKey<Ref<boolean>> = Symbol(
  'VIEWER_INSTANCE_INITIALIZED'
)
export const ViewerInitializedPromiseKey: InjectionKey<Promise<boolean>> = Symbol(
  'VIEWER_INSTANCE_INITIALIZED_PROMISE'
)
export const ViewerContainerKey: InjectionKey<HTMLElement> = Symbol('VIEWER_CONTAINER')

/**
 * Inject viewer instance (it should be provided in an ancestor component using setupViewerInjection())
 */
export function useInjectedViewer() {
  // force casting, cause we know for a fact that these injections won't be undefined - handling the "or undefined" check everywhere
  // is going to be a pain in the ass
  const viewer = inject(ViewerKey) as Viewer
  const container = inject(ViewerContainerKey) as HTMLElement
  const isInitialized = inject(ViewerInitializedKey) as Ref<boolean>
  const isInitializedPromise = inject(ViewerInitializedPromiseKey) as Promise<boolean>

  return { viewer, container, isInitialized, isInitializedPromise }
}

/**
 * Pass in a newly created Viewer instance and its container for injection down into child components
 * (through useInjectedViewer() or the injection keys manually).
 */
export function setupNewViewerInjection(params: {
  viewer: Viewer
  container: HTMLElement
  initPromise: Promise<void>
}) {
  const viewer = params.viewer
  const container = params.container
  const isInitialized = ref(false)
  const isInitializedPromise = params.initPromise.then(
    () => (isInitialized.value = true)
  )

  provide(ViewerKey, viewer)
  provide(ViewerContainerKey, container)
  provide(ViewerInitializedKey, isInitialized)
  provide(ViewerInitializedPromiseKey, isInitializedPromise)

  return { viewer, container, isInitialized, isInitializedPromise }
}

type GlobalViewerData = {
  viewer: Viewer
  container: HTMLElement
  initialized: Promise<void>
}
let globalViewerData: GlobalViewerData | null = null

export function setupViewer() {
  // Set up and inject viewer
  const viewerData = getOrInitViewerData()
  const { viewer, container, isInitialized, isInitializedPromise } =
    setupNewViewerInjection({
      viewer: viewerData.viewer,
      container: viewerData.container,
      initPromise: viewerData.initialized
    })

  return { viewer, container, isInitialized, isInitializedPromise }
}

function getOrInitViewerData(): GlobalViewerData {
  if (globalViewerData) {
    console.log('same viewer data')
    return globalViewerData
  }
  console.log('new viewer data')

  const container = document.createElement('div')
  container.id = 'renderer'
  container.style.display = 'block'

  const viewer = new Viewer(container, DefaultViewerParams)
  const initPromise = viewer.init()

  globalViewerData = {
    viewer,
    container,
    initialized: initPromise
  }

  return globalViewerData
}
