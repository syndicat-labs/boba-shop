import { Component, Input, OnInit } from '@angular/core';
import { LiveService, BannerEvent } from '../../core/live/live.service';

@Component({
  selector: 'boba-banner',
  standalone: true,
  template: `
    <div class="banner" role="region" aria-label="Promotion">
      <div class="banner-left">
        <div class="banner-kicker">{{current?.kicker || 'House · Batch at :00 · :20 · :40'}}</div>
        <div class="banner-title">{{current?.title || 'Brown Sugar — brewed Taichung way'}}</div>
      </div>
      <button class="banner-cta" (click)="onCta()">{{current?.cta_label || 'View →'}}</button>
    </div>
  `
})
export class BannerComponent implements OnInit {
  @Input() tenantSlug = 'boba-obsidian';
  current: BannerEvent | null = null;
  constructor(private live: LiveService){}
  ngOnInit(){
    this.live.connect(this.tenantSlug).subscribe(ev=>{ if(ev) this.current=ev; });
  }
  onCta(){
    if(!this.current) { document.querySelector('[data-id="brown-sugar"]')?.scrollIntoView({behavior:'smooth', block:'center'}); return; }
    const v=this.current;
    if(v.cta_type==='sku') document.querySelector(`[data-id="${v.cta_value}"]`)?.scrollIntoView({behavior:'smooth', block:'center'});
    else if(v.cta_type==='url') window.open(v.cta_value, '_blank');
    else document.querySelector(`[data-id="${v.cta_value}"]`)?.scrollIntoView({behavior:'smooth', block:'center'});
  }
}
