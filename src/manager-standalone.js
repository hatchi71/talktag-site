import { memberInsightStyles } from './manager-view.js';
const insightStyle=document.createElement('style');insightStyle.textContent=memberInsightStyles;document.head.append(insightStyle);
import { mountManagement } from './manager.js';
mountManagement();
