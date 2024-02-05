import { LanguageCode } from '@/types'
import de from './de.json'
import en from './en.json'
import es from './es.json'
import it from './it.json'
import ja from './ja.json'
import ko from './ko.json'
import zh from './zh.json'
import zh_tw from './zh_tw.json'



export const localesResources = {
  en: {
    translation: en
  },
  zh: {
    translation: zh
  },
  zh_tw: {
    translation: zh_tw
  },
  ja: {
    translation: ja
  },
  ko: {
    translation: ko
  },
  es: {
    translation: es
  },
  de: {
    translation: de
  },
  it: {
    translation: it
  }
}

export const fallbackLanguage = 'en'

export const supportLangs: Array<{
  value: string,
  label: string,
  disabled?: boolean
}> = [
    {
      value: 'en',
      label: 'English'
    }, {
      value: 'zh',
      label: '简体中文'
    }, {
      value: 'zh_tw',
      label: '繁體中文'
    }, {
      value: 'ja',
      label: '日本語'
    }, {
      value: 'ko',
      label: '한국어'
    }, {
      value: 'es',
      label: 'Español'
    }, {
      value: 'de',
      label: 'Deutsch'
    }, {
      value: 'it',
      label: 'Italiano'
    }
  ]

export const translateLangs: { value: LanguageCode, label: string, disabled?: boolean }[] = [
  { value: "zh_cn", label: "translate.langs.zh_cn" },
  { value: "zh_tw", label: "translate.langs.zh_tw" },
  { value: "yue", label: "translate.langs.yue" },
  { value: "en", label: "translate.langs.en" }, // English
  { value: "ja", label: "translate.langs.ja" },
  { value: "ko", label: "translate.langs.ko" }, // 한국어
  { value: "fr", label: "translate.langs.fr" },
  { value: "es", label: "translate.langs.es" }, // Español
  { value: "ru", label: "translate.langs.ru" },
  { value: "de", label: "translate.langs.de" }, // Deutsch
  { value: "it", label: "translate.langs.it" }, // Italiano
  { value: "tr", label: "translate.langs.tr" },
  { value: "pt", label: "translate.langs.pt" },
  { value: "vi", label: "translate.langs.vi" },
  { value: "id", label: "translate.langs.id" },
  { value: "th", label: "translate.langs.th" },
  { value: "ms", label: "translate.langs.ms" },
  { value: "ar", label: "translate.langs.ar" },
  { value: "hi", label: "translate.langs.hi" }, // (印度的官方语言)
  { value: "ro", label: "translate.langs.ro" },
  { value: "ug", label: "translate.langs.ug" },
  { value: "uz", label: "translate.langs.uz" },
  { value: "kk", label: "translate.langs.kk" },
  { value: "az", label: "translate.langs.az" },
  { value: "ky", label: "translate.langs.ky" },
  { value: "fa", label: "translate.langs.fa" },
  { value: "tg", label: "translate.langs.tg" },
]

export const transcriptLangs = [
  { value: "auto", label: "transcript.langs.auto" },
  { value: "en", label: "transcript.langs.en" },
  { value: "zh_s", label: "transcript.langs.zh_s" },
  { value: "zh_t", label: "transcript.langs.zh_t" },
  { value: "de", label: "transcript.langs.de" },
  { value: "es", label: "transcript.langs.es" },
  { value: "ru", label: "transcript.langs.ru" },
  { value: "ko", label: "transcript.langs.ko" },
  { value: "fr", label: "transcript.langs.fr" },
  { value: "ja", label: "transcript.langs.ja" },
]

export const moreTranscriptLangs = [
  { value: "pt", label: "transcript.langs.pt" },
  { value: "tr", label: "transcript.langs.tr" },
  { value: "pl", label: "transcript.langs.pl" },
  { value: "ca", label: "transcript.langs.ca" },
  { value: "nl", label: "transcript.langs.nl" },
  { value: "ar", label: "transcript.langs.ar" },
  { value: "sv", label: "transcript.langs.sv" },
  { value: "it", label: "transcript.langs.it" },
  { value: "id", label: "transcript.langs.id" },
  { value: "hi", label: "transcript.langs.hi" },
  { value: "fi", label: "transcript.langs.fi" },
  { value: "vi", label: "transcript.langs.vi" },
  { value: "he", label: "transcript.langs.he" },
  { value: "uk", label: "transcript.langs.uk" },
  { value: "el", label: "transcript.langs.el" },
  { value: "ms", label: "transcript.langs.ms" },
  { value: "cs", label: "transcript.langs.cs" },
  { value: "ro", label: "transcript.langs.ro" },
  { value: "da", label: "transcript.langs.da" },
  { value: "hu", label: "transcript.langs.hu" },
  { value: "ta", label: "transcript.langs.ta" },
  { value: "no", label: "transcript.langs.no" },
  { value: "th", label: "transcript.langs.th" },
  { value: "ur", label: "transcript.langs.ur" },
  { value: "hr", label: "transcript.langs.hr" },
  { value: "bg", label: "transcript.langs.bg" },
  { value: "lt", label: "transcript.langs.lt" },
  { value: "la", label: "transcript.langs.la" },
  { value: "mi", label: "transcript.langs.mi" },
  { value: "ml", label: "transcript.langs.ml" },
  { value: "cy", label: "transcript.langs.cy" },
  { value: "sk", label: "transcript.langs.sk" },
  { value: "te", label: "transcript.langs.te" },
  { value: "fa", label: "transcript.langs.fa" },
  { value: "lv", label: "transcript.langs.lv" },
  { value: "bn", label: "transcript.langs.bn" },
  { value: "sr", label: "transcript.langs.sr" },
  { value: "az", label: "transcript.langs.az" },
  { value: "sl", label: "transcript.langs.sl" },
  { value: "kn", label: "transcript.langs.kn" },
  { value: "et", label: "transcript.langs.et" },
  { value: "mk", label: "transcript.langs.mk" },
  { value: "br", label: "transcript.langs.br" },
  { value: "eu", label: "transcript.langs.eu" },
  { value: "is", label: "transcript.langs.is" },
  { value: "hy", label: "transcript.langs.hy" },
  { value: "ne", label: "transcript.langs.ne" },
  { value: "mn", label: "transcript.langs.mn" },
  { value: "bs", label: "transcript.langs.bs" },
  { value: "kk", label: "transcript.langs.kk" },
  { value: "sq", label: "transcript.langs.sq" },
  { value: "sw", label: "transcript.langs.sw" },
  { value: "gl", label: "transcript.langs.gl" },
  { value: "mr", label: "transcript.langs.mr" },
  { value: "pa", label: "transcript.langs.pa" },
  { value: "si", label: "transcript.langs.si" },
  { value: "km", label: "transcript.langs.km" },
  { value: "sn", label: "transcript.langs.sn" },
  { value: "yo", label: "transcript.langs.yo" },
  { value: "so", label: "transcript.langs.so" },
  { value: "af", label: "transcript.langs.af" },
  { value: "oc", label: "transcript.langs.oc" },
  { value: "ka", label: "transcript.langs.ka" },
  { value: "be", label: "transcript.langs.be" },
  { value: "tg", label: "transcript.langs.tg" },
  { value: "sd", label: "transcript.langs.sd" },
  { value: "gu", label: "transcript.langs.gu" },
  { value: "am", label: "transcript.langs.am" },
  { value: "yi", label: "transcript.langs.yi" },
  { value: "lo", label: "transcript.langs.lo" },
  { value: "uz", label: "transcript.langs.uz" },
  { value: "fo", label: "transcript.langs.fo" },
  { value: "ht", label: "transcript.langs.ht" },
  { value: "ps", label: "transcript.langs.ps" },
  { value: "tk", label: "transcript.langs.tk" },
  { value: "nn", label: "transcript.langs.nn" },
  { value: "mt", label: "transcript.langs.mt" },
  { value: "sa", label: "transcript.langs.sa" },
  { value: "lb", label: "transcript.langs.lb" },
  { value: "my", label: "transcript.langs.my" },
  { value: "bo", label: "transcript.langs.bo" },
  { value: "tl", label: "transcript.langs.tl" },
  { value: "mg", label: "transcript.langs.mg" },
  { value: "as", label: "transcript.langs.as" },
  { value: "tt", label: "transcript.langs.tt" },
  { value: "haw", label: "transcript.langs.haw" },
  { value: "ln", label: "transcript.langs.ln" },
  { value: "ha", label: "transcript.langs.ha" },
  { value: "ba", label: "transcript.langs.ba" },
  { value: "jw", label: "transcript.langs.jw" },
  { value: "su", label: "transcript.langs.su" },
  { value: "yue", label: "transcript.langs.yue" }
]