import { ClsStore } from 'nestjs-cls';

export interface AppClsStore extends ClsStore {
  lang: 'en' | 'ar';
}
