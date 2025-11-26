import { Injectable } from '@angular/core';
import { DEFAULT_THEME } from './theme.config';
import { ThemeVars } from './theme.tokens';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private key = 'ecom-theme';

  get(): ThemeVars {
    const raw = localStorage.getItem(this.key);
    return raw ? { ...DEFAULT_THEME, ...JSON.parse(raw) } : DEFAULT_THEME;
  }

  apply(theme: ThemeVars = this.get()) {
    const s = document.documentElement.style;
    s.setProperty('--input-border', theme.inputBorder);
    s.setProperty('--input-bg', theme.inputBg);
    s.setProperty('--input-text', theme.inputText);
    s.setProperty('--input-placeholder', theme.inputPlaceholder);
    s.setProperty('--input-focus', theme.inputFocus);

    s.setProperty('--btn-bg', theme.btnBg);
    s.setProperty('--btn-text', theme.btnText);
    s.setProperty('--btn-border', theme.btnBorder);
    s.setProperty('--btn-bg-hover', theme.btnBgHover);
    s.setProperty('--btn-text-hover', theme.btnTextHover);
    s.setProperty('--btn-border-hover', theme.btnBorderHover);

    s.setProperty('--price-color', theme.priceColor);

    s.setProperty('--search-input-bg', theme.searchInputBg);
    s.setProperty('--search-input-border', theme.searchInputBorder);
    s.setProperty('--search-result-bg', theme.searchResultBg);
    s.setProperty('--search-result-border', theme.searchResultBorder);
    s.setProperty('--search-result-title', theme.searchResultTitle);

    s.setProperty('--cart-card-bg', theme.cartCardBg);
    s.setProperty('--cart-card-bd', theme.cartCardBd);
    s.setProperty('--cart-qty-bg', theme.cartQtyBg);
    s.setProperty('--cart-qty-bd', theme.cartQtyBd);

    s.setProperty('--product-card-bg', theme.productCardBg);
    s.setProperty('--product-card-bd', theme.productCardBd);
    s.setProperty('--product-cta-bg', theme.productCtaBg);
    s.setProperty('--product-cta-bg-hover', theme.productCtaBgHover);

    s.setProperty('--header-bg', theme.headerBg);
    s.setProperty('--header-text', theme.headerText);
    s.setProperty('--header-search-bg', theme.headerSearchBg);
    s.setProperty('--header-search-border', theme.headerSearchBorder);
    s.setProperty('--header-accent', theme.headerAccent);
    s.setProperty('--header-icon-bg', theme.headerIconBg);
    s.setProperty('--header-icon-tx', theme.headerIconTx);


    s.setProperty('--footer-title', theme.footerTitle);
    s.setProperty('--footer-link', theme.footerLink);
    s.setProperty('--footer-link-hover', theme.footerLinkHover);
    s.setProperty('--footer-icon-bg', theme.footerIconBg);
    s.setProperty('--footer-icon-tx', theme.footerIconTx);
    s.setProperty('--footer-divider', theme.footerDivider);      

    s.setProperty('--hero-bg', theme.heroBg);
    s.setProperty('--hero-title', theme.heroTitle);
    s.setProperty('--hero-subtitle', theme.heroSubtitle);
    s.setProperty('--hero-cta-bg', theme.heroCtaBg);
    s.setProperty('--hero-cta-bg-hover', theme.heroCtaBgHover);
    s.setProperty('--hero-cta-tx', theme.heroCtaTx);
  
  // Tablas
  s.setProperty('--table-bg', theme.tableBg);
  s.setProperty('--table-border', theme.tableBorder);
  s.setProperty('--table-header-bg', theme.tableHeaderBg);
  s.setProperty('--table-header-text', theme.tableHeaderText);
  s.setProperty('--table-row-hover', theme.tableRowHover);
  s.setProperty('--table-row-stripe', theme.tableRowStripe);
  s.setProperty('--table-muted-text', theme.tableMutedText);
  s.setProperty('--badge-bg', theme.badgeBg);
  s.setProperty('--badge-text', theme.badgeText);
  
    
    localStorage.setItem(this.key, JSON.stringify(theme));
  }
}
