import type { BgmData, EditorData, LibraryData, TemoData } from '@/app/interface';
import {
  getJSONDataFromEditorContents,
  patchTemoData,
  splitString,
  updateTemoData,
} from '@/app/lib/utils';
import { extractTextSegmentsFromNodeWithMentions, type TextSegment } from '@/app/lib/tts-segments';
import {
  getTTSHostErrorMessage,
  getTTSSelectionConfig,
  isLegacyTTSSelection,
  mergePluginConfigLayers,
  type TTSMergePayload,
  type TTSSelection,
} from '@/app/lib/tts-plugin';
import { cloneDeep } from 'lodash-es';
import md5 from 'md5';
import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { toast } from '@/app/components/ui/use-toast';
import i18n from 'i18next';

import { customEvents, eventBus } from '@/events/eventBus';

const MAX_TEXT_LENGTH = 1000;

function buildSegmentRuntimeConfig(
  segment: TextSegment,
  selection?: TTSSelection
) {
  const runtimeConfig: Record<string, any> = cloneDeep(segment.config || {});
  const speedFieldKey = selection?.editorFields?.speed;
  const emotionFieldKey = selection?.editorFields?.emotion;

  if (segment.speed != null && speedFieldKey) {
    runtimeConfig[speedFieldKey] = segment.speed;
  }

  if (segment.emotion && segment.emotion !== 'none' && emotionFieldKey) {
    runtimeConfig[emotionFieldKey] = segment.emotion;
  }

  return Object.keys(runtimeConfig).length ? runtimeConfig : undefined;
}

function sanitizeSegmentText(text: string) {
  return text.replace(/<br \/>/g, '').replace(/\r/g, '');
}

class DataStore {
  constructor() {
    makeAutoObservable(this);
    makePersistable(this, {
      name: 'dataStore',
      properties: [
        'temoData',
        'editorData',
        'libraryData',
        'TTSType',
        'bgm',
      ],
    });
  }

  temoData: TemoData[] = []

  editorData: { type: 'doc', content: EditorData } | string = ''

  libraryData: LibraryData[] = []

  TTSType: 'audio' | 'video' = 'audio'

  CurTTSType: 'audio' | 'video' = 'audio'

  bgm: BgmData | null = null

  setBgm = (bgm: BgmData | null) => {
    this.bgm = bgm ? cloneDeep(bgm) : null;
    if (this.bgm) {
      localStorage.setItem('temo-tts-bgm', JSON.stringify(this.bgm));
    } else {
      localStorage.removeItem('temo-tts-bgm');
    }
  }

  setTTSType = (type: 'audio' | 'video', needSave?: boolean) => {
    this.TTSType = type;
    if (needSave) {
      this.CurTTSType = type;
      localStorage.setItem('temo-tts-type', this.TTSType);
    }
  }

  setTemoData = (data: TemoData) => {
    this.temoData.unshift(data);
  }

  setEditorData = (data: any) => {
    this.editorData = data;
    localStorage.setItem('temo-editor', JSON.stringify(data));
  }

  removeTemoData = async (data: TemoData[]) => {
    if (!data.length) {
      return;
    }

    const removeIds = new Set(data.map(item => item.uuid));
    const previousTemoData = cloneDeep(this.temoData);
    const nextTemoData = this.temoData.filter(item => !removeIds.has(item.uuid));

    this.temoData = nextTemoData;

    try {
      await Promise.all([
        window.AIM.tts.updateTemoData(cloneDeep(nextTemoData)),
        window.AIM.tts.deleteTemoData(Array.from(removeIds)),
      ]);
    } catch (error) {
      this.temoData = previousTemoData;
      throw error;
    }
  }

  setLibraryData = (data: LibraryData[]) => {
    this.libraryData = data.concat(this.libraryData);
    window.AIM.tts.saveTemoLibrary(cloneDeep(this.libraryData));
    console.log(data);
  }

  copyLibraryFile = async (path: string, duration?: string) => {
    const data = await window.AIM.tts.copyTemoFile(path, 'library');
    if (!data.exist) {
      data.type = 'media';
      data.duration = duration;
      this.setLibraryData([data]);
    }
  }

  initData = async () => {
    let temoData = await window.AIM.tts.getTemoData() || [];
    if (temoData?.length) {
      temoData = temoData.map((item: TemoData) => {
        if (!item.fileList) {
          item.fileList = patchTemoData(item);
        }
        return updateTemoData(item);
      });
    }
    const editorData = localStorage.getItem('temo-editor') || '';
    const ttsType = localStorage.getItem('temo-tts-type') || 'audio';
    const bgm = localStorage.getItem('temo-tts-bgm');
    const libraryData = (await window.AIM.tts.getTemoLibrary() || []).filter((item: any) => item.type !== 'pic');

    runInAction(() => {
      this.temoData = temoData;
      this.editorData = editorData ? JSON.parse(editorData) : '';
      this.CurTTSType = this.TTSType = ttsType as 'audio' | 'video';
      this.bgm = bgm ? JSON.parse(bgm) : null;
      this.libraryData = libraryData;
    });
  }

  currentTTSUUID: string = ''
  currentTTSProgress: number = 0
  synthesizing = false

  mergeTemo = async (
    data: {
      selection?: TTSSelection,
      uuid: string,
      editorData: any,
      bgm?: BgmData,
    }
  ) => {
    try {
      if (!data.selection) {
        toast({
          variant: 'destructive',
          description: i18n.t('tts.select voice', { defaultValue: 'Please select a TTS plugin and voice first.' }),
        });
        return;
      }

      if (!data.selection.pluginId || isLegacyTTSSelection(data.selection)) {
        toast({
          variant: 'destructive',
          description: i18n.t('tts.reselect plugin voice', {
            defaultValue: 'This item uses legacy TTS settings. Please reselect a plugin voice before synthesis.',
          }),
        });
        return;
      }

      console.log('========== mergeTemo 璋冭瘯 ==========');
      console.log('data.editorData:', data.editorData);
      console.log('data.editorData.content:', data.editorData?.content);
      console.log('data.editorData.content[0]:', JSON.stringify(data.editorData?.content?.[0], null, 2));
      console.log('data.target:', data.selection.target);

      const jsonData: any[] = getJSONDataFromEditorContents(data.editorData?.content, data.selection.target);
      console.log('jsonData:', jsonData);
      console.log('====================================');

      if (!jsonData?.length) {
        toast({
          variant: 'destructive',
          description: i18n.t('app.edit data'),
        });
        return;
      }

      const allSegments: (TextSegment & { cardOptions?: any })[] = [];

      jsonData.forEach((item: any) => {
        const segments = extractTextSegmentsFromNodeWithMentions(item);
        segments.forEach(seg => {
          allSegments.push({
            ...seg,
            cardOptions: item.attrs?.voice,
          });
        });
      });

      console.log('allSegments with marks:', allSegments);

      const params: TTSMergePayload = {
        mode: 'plugin',
        provider: data.selection.provider,
        pluginId: data.selection.pluginId,
        data: allSegments.map((seg) => {
          const text = sanitizeSegmentText(seg.text);
          const segmentOptions = mergePluginConfigLayers(
            data.selection?.config,
            getTTSSelectionConfig(seg.cardOptions, data.selection),
            getTTSSelectionConfig(seg.voiceConfig, data.selection),
            buildSegmentRuntimeConfig(seg, data.selection)
          );

          const item = {
            text,
            md5: md5(JSON.stringify({
              provider: data.selection?.provider,
              pluginId: data.selection?.pluginId,
              options: segmentOptions,
              text,
            })),
            options: segmentOptions,
          };

          if (text.length > MAX_TEXT_LENGTH) {
            return {
              ...item,
              textChunks: splitString(text),
            };
          }

          return item;
        }).filter((item) => item.text.trim().length > 0),
      };

      if (!params.data.length) {
        toast({
          variant: 'destructive',
          description: i18n.t('app.edit data'),
        });
        return;
      }

      this.synthesizing = true;
      console.log('========== TTS 鍚堟垚璋冭瘯 ==========');
      console.log('鎻愬彇鐨勬枃鏈墖娈?allSegments:', allSegments);
      console.log('鏈€缁堟彁浜ゅ弬鏁?params:', JSON.stringify(params, null, 2));
      console.log('==================================');

      const result = await window.AIM.tts.mergeTemo(cloneDeep(params), data.uuid, {
        editorData: cloneDeep(data.editorData),
        bgm: cloneDeep(data.bgm),
        type: this.TTSType,
        ttsOptions: cloneDeep(data.selection),
      });

      console.log(result);
      return result;
    } catch (error) {
      toast({
        variant: 'destructive',
        description: getTTSHostErrorMessage(
          error,
          i18n.t('tts.merge host upgrade required', {
            defaultValue: 'Plugin TTS synthesis failed. Please confirm the Electron host has been upgraded to the plugin TTS merge API.',
          })
        ),
      });
      throw error;
    } finally {
      this.synthesizing = false;
    }
  }

  handleMessage = async (e: any) => {
    if (e && e.ipcData) {
      const msg = e.ipcData;
      if (msg.type === 'temo:audio:start') {
        console.log('temo:audio:start');
        this.currentTTSUUID = msg.data.uuid;
      }
      if (msg.type === 'temo:audio:progress') {
        console.log('temo:audio:progress');
        this.currentTTSProgress = Math.floor(msg.data.percent || 0);
      }
      if (msg.type === 'temo:audio:error') {
        console.log('temo:audio:error');
        this.currentTTSUUID = '';
        this.currentTTSProgress = 0;
      }
      if (msg.type === 'temo:audio:abort') {
        console.log('temo:audio:abort');
        this.currentTTSUUID = '';
        this.currentTTSProgress = 0;
      }
      if (msg.type === 'temo:audio:end') {
        console.log('temo:audio:end');
        this.currentTTSUUID = '';
        this.currentTTSProgress = 0;
      }
    }
  };

  handleDataMessage = () => {
    eventBus.on(customEvents.RendererMessage, this.handleMessage);
  };

  removeDataHandler = () => {
    eventBus.off(customEvents.RendererMessage, this.handleMessage);
  };
}

export default DataStore
