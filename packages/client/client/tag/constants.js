// tags that shouldn't map out to real names
export const whitelist = [
  'title',
  'meta',
  'head',
  'circle',
  'col',
  'body'
]

export const niceAttrs = {
  class: 'className',
  for: 'htmlFor',
  srcset: 'srcSet',
  novalidate: 'noValidate',
  autoplay: 'autoPlay',
  frameborder: 'frameBorder',
  allowfullscreen: 'allowFullScreen',
  tabindex: 'tabIndex',
}


export default {
  whitelist,
  niceAttrs
}