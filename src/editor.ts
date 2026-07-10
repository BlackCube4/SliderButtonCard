/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/camelcase */
import { CSSResult, LitElement, TemplateResult, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { ActionConfig, HomeAssistant, LovelaceCardEditor, computeDomain, fireEvent } from './ha-helpers';
import { ActionButtonConfig, ActionButtonConfigDefault, ActionButtonMode, Domain, IconConfig, IconConfigDefault, SliderBackground, SliderButtonCardConfig, SliderConfig, SliderConfigDefault, SliderDirection, ColorMode } from './types';
import { applyPatch, getEnumValues, getSliderDefaultForEntity } from './utils';
import { localize, setLanguage } from './localize/localize';

@customElement('slider-button-card-editor')
export class SliderButtonCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;
  
  @state() private _config?: SliderButtonCardConfig;
  @state() private _helpers?: any;

  private _initialized = false;
  private directions = getEnumValues(SliderDirection);
  private backgrounds = getEnumValues(SliderBackground);
  private actionModes = getEnumValues(ActionButtonMode);
  private colorModes = getEnumValues(ColorMode);

  public async setConfig(config: SliderButtonCardConfig): Promise<void> {
    this._config = config;
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    return true;
  }

  protected updated(): void {
    this._fixInputWidths();
  }

  // wa-input füllt seinen ha-input-Host im flex-Layout (z.B. Farbzeile) nicht
  // von selbst und wirkt dadurch zu schmal. Da wa-input im Shadow-DOM von
  // ha-input liegt, erreichen unsere Editor-Styles es nicht - die width:100%-
  // Regel muss direkt in dessen Shadow-Root injiziert werden.
  private _fixInputWidths(): void {
    this.shadowRoot?.querySelectorAll('ha-input').forEach((el: any) => {
      const root = el.shadowRoot as ShadowRoot | null;
      if (!root || root.querySelector('style[data-sbc-wainput]')) {
        return;
      }
      const style = document.createElement('style');
      style.setAttribute('data-sbc-wainput', '');
      style.textContent = 'wa-input { width: 100%; }';
      root.appendChild(style);
    });
  }

  get _name(): string {
    return this._config?.name || '';
  }

  get _show_name(): boolean {
    return typeof this._config?.show_name === 'undefined' ? true : this._config?.show_name;
  }

  get _show_state(): boolean {
    return typeof this._config?.show_state === 'undefined' ? true : this._config?.show_state;
  }

  get _show_attribute(): boolean {
    return typeof this._config?.show_attribute === 'undefined' ? true : this._config?.show_attribute;
  }

  get _compact(): boolean {
    return typeof this._config?.compact !== 'boolean' ? true : this._config?.compact;
  }

  get _entity(): string {
    return this._config?.entity || '';
  }

  get _attribute(): string {
    return this._config?.attribute || '';
  }

  get _icon(): IconConfig {
    return this._config?.icon || IconConfigDefault;
  }

  get _slider(): SliderConfig {
    return this._config?.slider || SliderConfigDefault;
  }

  get _action_button(): ActionButtonConfig {
    return this._config?.action_button || ActionButtonConfigDefault;
  }

  get _entityAttributes(): string[] {
    if (!this.hass || !this._entity) {
      return [];
    }
    return Object.keys(this.hass.states[this._entity].attributes).sort();
  }

  protected _renderOptionSelector(
    configValue: string,
    options: string[] | { value: string; label: string }[] = [],
    label: string,
    value: string | ActionConfig | undefined,

  ): TemplateResult | void {
    if (!this._config) {
      return;
    }

    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{
          select: {
            mode: 'dropdown',
            options: options
          },
        }}
        label=${label}
        .value=${value}
        .required=${true}
        .configValue=${configValue}
        @value-changed=${this._valueChangedSelect}
      >
      </ha-selector>
    `;
  }

  protected _renderNumberSelector(
    configValue: string,
    label: string,
    value: number | undefined,
    step?: number,
  ): TemplateResult | void {
    if (!this._config) {
      return;
    }

    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{
          number: {
            mode: 'box',
            step: step ?? 1,
          },
        }}
        label=${label}
        .value=${value}
        .configValue=${configValue}
        @value-changed=${this._valueChangedSelect}
      >
      </ha-selector>
    `;
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }
    setLanguage(this.hass);

    return html`
      <div class="card-config">
        <div class="panel-content top-fields">
          <ha-selector
            .hass=${this.hass}
            .selector=${{
              entity: {
                domain: getEnumValues(Domain),
              }
            }}
            label="${localize('tabs.general.entity')}"
            .value=${this._entity}
            .configValue=${'entity'}
            @value-changed=${this._valueChangedEntity}
          ></ha-selector>

          <ha-input
            label="${localize('tabs.general.name')}"
            .value=${this._name}
            .placeholder=${this._name || this.hass.states[this._entity]?.attributes?.friendly_name}
            .configValue=${'name'}
            @input=${this._valueChanged}
          ></ha-input>
        </div>

        <ha-expansion-panel outlined .header=${localize('tabs.general.title')}>
          <div class="panel-content">
            ${this._renderOptionSelector(`attribute`, this._entityAttributes, localize('tabs.general.attribute'), this._attribute)}
            <div class="side-by-side">
              <ha-formfield label="${localize('tabs.general.show_name')}">
                <ha-switch
                  .checked=${this._show_name}
                  .configValue=${'show_name'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${localize('tabs.general.show_state')}">
                <ha-switch
                  .checked=${this._show_state}
                  .configValue=${'show_state'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${localize('tabs.general.show_attribute')}">
                <ha-switch
                  .checked=${this._show_attribute}
                  .configValue=${'show_attribute'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${localize('tabs.general.compact')}">
                <ha-switch
                  .checked=${this._compact}
                  .configValue=${'compact'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${localize('tabs.general.scale_on_press')}">
                <ha-switch
                  .checked=${this._config?.scale_on_press === true}
                  .configValue=${'scale_on_press'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
            </div>
          </div>
        </ha-expansion-panel>

        <ha-expansion-panel outlined .header=${localize('tabs.icon.title')}>
          <div class="panel-content">
            <ha-icon-picker
              .hass=${this.hass}
              .value=${this._icon.icon}
              .configValue=${"icon.icon"}
              .label=${localize('tabs.icon.icon')}
              @value-changed=${this._valueChanged}
            ></ha-icon-picker>
            ${this.renderColorMode('icon')}
            <div class="side-by-side">
              <ha-formfield label="${localize('tabs.icon.show_icon')}">
                <ha-switch
                  .checked=${this._icon.show}
                  .configValue=${'icon.show'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${localize('tabs.icon.use_brightness')}">
                <ha-switch
                  .checked=${this._icon.use_brightness}
                  .configValue=${'icon.use_brightness'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
            </div>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                ui_action: {}
              }}
          label="${localize('tabs.icon.tap_action')}"
              .value=${this._icon.tap_action}
              .required=${false}
              .configValue=${"icon.tap_action"}
              @value-changed=${this._valueChangedSelect}
            ></ha-selector>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                ui_action: {}
              }}
          label="${localize('tabs.icon.hold_action')}"
              .value=${this._icon.hold_action}
              .required=${false}
              .configValue=${"icon.hold_action"}
              @value-changed=${this._valueChangedSelect}
            ></ha-selector>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                ui_action: {}
              }}
          label="${localize('tabs.icon.double_tap_action')}"
              .value=${this._icon.double_tap_action}
              .required=${false}
              .configValue=${"icon.double_tap_action"}
              @value-changed=${this._valueChangedSelect}
            ></ha-selector>
          </div>
        </ha-expansion-panel>

        <ha-expansion-panel outlined .header=${localize('tabs.slider.title')}>
          <div class="panel-content">
            <div class="side-by-side">
              ${this._renderOptionSelector(
                `slider.direction`,
                this.directions.map(direction => {
                  return {'value': direction, 'label': localize(`direction.${direction}`)}
                }), localize('tabs.slider.direction'),
                this._slider.direction || ''
              )}
              ${this._renderOptionSelector(
                `slider.background`,
                this.backgrounds.map(background => {
                  return {'value': background, 'label': localize(`background.${background}`)}
                }), localize('tabs.slider.background'),
                this._slider.background || ''
              )}
            </div>
            ${this.renderColorMode('slider')}
            <div class="side-by-side number-row">
              ${this._renderNumberSelector('slider.min_value', localize('tabs.slider.min_value'), this._slider.min_value)}
              ${this._renderNumberSelector('slider.max_value', localize('tabs.slider.max_value'), this._slider.max_value)}
            </div>
            <div class="side-by-side number-row">
              ${this._renderNumberSelector('slider.transition', localize('tabs.slider.transition'), this._slider.transition, 0.05)}
            </div>
            <div class="side-by-side">
              ${this.renderBrightness('slider')}
              <ha-formfield label="${localize('tabs.slider.show_track')}">
                <ha-switch
                  .checked=${this._slider.show_track}
                  .configValue=${'slider.show_track'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
            </div>
            <div class="side-by-side">
              <ha-formfield label="${localize('tabs.slider.disable_sliding')}">
                <ha-switch
                  .checked=${this._slider.disable_sliding}
                  .configValue=${'slider.disable_sliding'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${localize('tabs.slider.immediate_update')}">
                <ha-switch
                  .checked=${this._slider.immediate_update === true}
                  .configValue=${'slider.immediate_update'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
            </div>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                ui_action: {}
              }}
          label="${localize('tabs.slider.tap_action')}"
              .value=${this._slider.tap_action}
              .required=${false}
              .configValue=${"slider.tap_action"}
              @value-changed=${this._valueChangedSelect}
            ></ha-selector>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                ui_action: {}
              }}
          label="${localize('tabs.slider.hold_action')}"
              .value=${this._slider.hold_action}
              .required=${false}
              .configValue=${"slider.hold_action"}
              @value-changed=${this._valueChangedSelect}
            ></ha-selector>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                ui_action: {}
              }}
          label="${localize('tabs.slider.double_tap_action')}"
              .value=${this._slider.double_tap_action}
              .required=${false}
              .configValue=${"slider.double_tap_action"}
              @value-changed=${this._valueChangedSelect}
            ></ha-selector>
          </div>
        </ha-expansion-panel>

        <ha-expansion-panel outlined .header=${localize('tabs.action_button.title')}>
          <div class="panel-content">
            <div class="side-by-side">
              <ha-formfield label="${localize('tabs.action_button.show_button')}">
                <ha-switch
                  .checked=${this._action_button.show}
                  .configValue=${'action_button.show'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${localize('tabs.action_button.show_spinner')}">
                <ha-switch
                  .checked=${this._action_button.show_spinner}
                  .configValue=${'action_button.show_spinner'}
                  @change=${this._valueChanged}
                ></ha-switch>
              </ha-formfield>
            </div>
            <ha-icon-picker
              .hass=${this.hass}
              .value=${this._action_button.icon}
              .placeholder=${this._action_button.icon || 'mdi:power'}
              .configValue=${"action_button.icon"}
          label="${localize('tabs.action_button.icon')}"
              @value-changed=${this._valueChanged}
            >
            </ha-icon-picker>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                ui_action: {}
              }}
          label="${localize('tabs.action_button.tap_action')}"
              .value=${this._action_button.tap_action}
              .required=${false}
              .configValue=${"action_button.tap_action"}
              @value-changed=${this._valueChangedSelect}
            ></ha-selector>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                ui_action: {}
              }}
          label="${localize('tabs.action_button.hold_action')}"
              .value=${this._action_button.hold_action}
              .required=${false}
              .configValue=${"action_button.hold_action"}
              @value-changed=${this._valueChangedSelect}
            ></ha-selector>
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                ui_action: {}
              }}
          label="${localize('tabs.action_button.double_tap_action')}"
              .value=${this._action_button.double_tap_action}
              .required=${false}
              .configValue=${"action_button.double_tap_action"}
              @value-changed=${this._valueChangedSelect}
            ></ha-selector>
          </div>
        </ha-expansion-panel>
      </div>
    `;
  }

  protected renderBrightness(path: string): TemplateResult | void {
    const item = this[`_${path}`];
    return html`
      <ha-formfield label="${localize(`tabs.${path}.use_brightness`)}">
        <ha-switch
          .checked=${item.use_brightness}
          .configValue="${path}.use_brightness"
          @change=${this._valueChanged}
        ></ha-switch>
      </ha-formfield>
    `;
  }

  protected renderColorMode(path: string): TemplateResult | void {
    const item = this[`_${path}`];
    return html`
      <div class="side-by-side color-row">
        ${this._renderOptionSelector(
          `${path}.color_mode`,
          this.colorModes.map(color_mode => {
            return {'value': color_mode, 'label': localize(`color_mode.${color_mode}`)}
          }), localize('color_mode.label'),
          item.color_mode || ColorMode.DEFAULT
        )}
        ${item.color_mode === ColorMode.CUSTOM ? html`
          <ha-input
            label="${localize(`tabs.${path}.color`)}"
            .value=${item.color || ''}
            placeholder="#ffffff"
            .configValue="${path}.color"
            @input=${this._valueChanged}
          >
            <div
              slot="end"
              class="color-swatch-wrapper"
              style="background: ${this._toHexColor(item.color)}"
            >
              <input
                type="color"
                class="color-swatch-input"
                .value=${this._toHexColor(item.color)}
                .configValue="${path}.color"
                @input=${this._colorChanged}
              />
            </div>
          </ha-input>
        ` : ''}
      </div>
    `;
  }

  /** Wandelt einen beliebigen CSS-Farbwert (hex, rgb(), Name, var(...)) in #rrggbb für den Farbwähler um. */
  private _toHexColor(color?: string): string {
    if (!color) {
      return '#000000';
    }
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) {
      return '#000000';
    }
    ctx.fillStyle = '#000000';
    ctx.fillStyle = color;
    const computed = ctx.fillStyle;
    return /^#[0-9a-f]{6}$/i.test(computed) ? computed : '#000000';
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    this._initialized = true;
  }

  private _valueChangedSelect(ev): void {
    const target = ev.target;
    const value = ev.detail.value;
    if (value === undefined || value === null || value === '') {
      return;
    }
    this._changeValue(target.configValue, value);
  }

  private _valueChangedEntity(ev): void {
    const target = ev.target;
    const value = ev.detail?.value !== undefined ? ev.detail.value : ev.target?.value;
    if (value === undefined || value === null) {
      return;
    }
    const updateDefaults = computeDomain(value) !== computeDomain(this._config?.entity || 'light.dummy');
    this._changeValue(target.configValue, value);
    this._changeValue('name', '');
    this._changeValue('attribute', '');
    this._changeValue('icon.icon', '');
    if (updateDefaults) {
      const cfg = structuredClone(this._config);
      applyPatch(cfg, ['slider'], getSliderDefaultForEntity(value));
      this._config = cfg;
      fireEvent(this, 'config-changed', { config: this._config });
    }
  }

  private _valueChanged(ev): void {
    const target = ev.target;
    const value = ev.target?.value;
    this._changeValue(target.configValue, target.checked !== undefined ? target.checked : value);
  }

  // Farb-Input: gezielt `.value` lesen. Ein natives <input type="color"> hat immer eine
  // `checked`-Property (Default false), daher nicht den generischen _valueChanged verwenden.
  // stopPropagation, da dieses Element im "end"-Slot des umgebenden ha-input sitzt -
  // ohne das würde sein input-Event auch den generischen Handler des ha-input triggern.
  private _colorChanged(ev): void {
    ev.stopPropagation();
    this._changeValue(ev.target.configValue, ev.target.value);
  }

  private _changeValue(configValue: string, value: string | boolean | number): void {
    if (!this._config || !this.hass) {
      return;
    }
    if (this[`_${configValue}`] !== undefined && this[`_${configValue}`] === value) {
      return;
    }
    if (configValue) {
      const cfg = structuredClone(this._config);
      applyPatch(cfg, [...configValue.split('.')], value);
      this._config = cfg;
      if (value === '') {
        delete this._config[configValue];
      }
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles(): CSSResult {
    return css`
      ha-input {
        width: 100%;
      }
      ha-switch {
        padding: 16px 6px;
      }
      .side-by-side {
        display: flex;
        flex-flow: row wrap;
      }
      .side-by-side > * {
        padding-right: 8px;
        width: 50%;
        flex-flow: column wrap;
        box-sizing: border-box;
      }
      /* Custom-Elements sind per Default display:inline -> margin-bottom wirkt nicht.
         Als Block darstellen, damit der Zeilenabstand greift. */
      .panel-content > ha-selector,
      .panel-content > ha-input,
      .panel-content > ha-icon-picker {
        display: block;
      }
      /* Einheitlicher 8px-Abstand zwischen allen "Zeilen" eines Panels, egal ob
         side-by-side-Gruppe oder einzelnes Element (Selector/Input/Picker). */
      .panel-content > ha-selector,
      .panel-content > ha-input,
      .panel-content > ha-icon-picker,
      .panel-content > .side-by-side {
        margin-bottom: 8px;
      }
      /* ha-input setzt padding-bottom über --ha-space-2 (HA-Spacing-Token, 8px),
         das wir hier nicht brauchen; zusätzlicher negativer Margin zieht die
         Zeile ganz an den nächsten Block heran. Muss die generische Regel oben
         überstimmen -> gleiche Spezifität, aber später in der Datei. */
      .panel-content > .number-row {
        --ha-space-2: 0px;
        margin-bottom: -12px;
      }
      .panel-content > *:last-child {
        margin-bottom: 0;
      }
      .side-by-side > *:last-child {
        flex: 1;
        padding-right: 0;
      }
      /* Die Farbzeile nutzt dasselbe .side-by-side-Layout wie Richtung/Hintergrund
         und Min/Max (Dropdown allein -> volle Breite, mit Hex-Feld -> 50/50), damit
         die Spaltenbreiten exakt zu den übrigen Zeilen passen. Nur der Feinschliff
         bleibt hier: ha-input reserviert per Default vertikalen Platz für einen
         (nie angezeigten) Hilfetext über --ha-space-2 -> auf 0, sonst entsteht eine
         zu große Lücke unter der Zeile. */
      .color-row {
        --ha-space-2: 0px;
      }
      /* Hinweis: Das innere wa-input füllt seinen ha-input-Host im flex-Layout
         nicht von selbst und muss width:100% bekommen. Es liegt aber im
         Shadow-DOM von ha-input, das unsere Styles hier nicht erreichen -> die
         Regel wird per JS in dessen Shadow-Root injiziert (_fixInputWidths). */
      /* Farbkreis im "end"-Slot des Hex-Textfelds: das eigentliche <input
         type="color"> bleibt unsichtbar (aber klickbar/öffnet den nativen
         Picker) und liegt über einem sauber gerenderten CSS-Kreis - direktes
         Styling des nativen Swatch via border-radius erzeugt in Chrome/Firefox
         sichtbare helle Pixel am Rand, v.a. bei dunklen Farben. */
      .color-swatch-wrapper {
        position: relative;
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        box-shadow: inset 0 0 0 1px var(--divider-color, rgba(0, 0, 0, 0.15));
        overflow: hidden;
      }
      .color-swatch-input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        padding: 0;
        border: none;
        opacity: 0;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
      }
      .suffix {
        margin: 0 8px;
      }
      .group {
        padding: 15px;
        border: 1px solid var(--primary-text-color)
      }
      .card-config > ha-expansion-panel,
      .card-config > .top-fields {
        display: block;
        margin-bottom: 8px;
      }
      /* ha-expansion-panel reserviert per Default nur horizontal Platz
         (0 8px). Die zusätzliche Luft oben/unten soll nur sichtbar sein,
         wenn die Kategorie tatsächlich aufgeklappt ist. */
      ha-expansion-panel[expanded] {
        --expansion-panel-content-padding: 12px 8px 16px;
      }
    `;
  }
}
