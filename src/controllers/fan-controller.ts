import { STATES_OFF } from '../ha-helpers';
import { Controller } from './controller';

export class FanController extends Controller {
  _min = 0;
  _targetValue;
  _invert = false;
  _clickPosition;
  _clickPositionLock;
  _originalValue;
  _originalValueLock;

  get _value(): number {
    return this.isUnavailable || STATES_OFF.includes(this.state)
      ? 0
      : this.hasSlider ? this.stateObj.attributes.percentage : 1;
  }

  set _value(value) {
    const service = value > 0 ? 'turn_on' : 'turn_off';
    if (value > 0 && this.hasSlider) {
      this._hass.callService('fan', 'set_percentage', {
        // eslint-disable-next-line @typescript-eslint/camelcase
        entity_id: this.stateObj.entity_id,
        percentage: value
      });
    } else {
      this._hass.callService('fan', service, {
        // eslint-disable-next-line @typescript-eslint/camelcase
        entity_id: this.stateObj.entity_id
      });
    }
  }

  get _step(): number {
    return this.hasSlider ? this.stateObj.attributes.percentage_step : 1;
  }

  get label(): string {
    if (this.percentage > 0) {
      if (this.hasSlider) {
        return `${this.percentage}%`
      } else {
        return this._hass.localize('component.fan.entity_component._.state.on');
      }
    }
    return this._hass.localize('component.fan.entity_component._.state.off');
  }

  get hasSlider(): boolean {
    return 'percentage' in this.stateObj.attributes;
  }

  get _max(): number {
    return this.hasSlider ? 100 : 1;
  }

  /**
   * HA rundet Prozentwerte bei gestuften Lüftern nicht auf die nächstgelegene Stufe,
   * sondern wählt die erste Stufe, deren obere Grenze den Wert noch abdeckt
   * (percentage_to_ordered_list_item in HA-Core, ceiling-basiert). Math.round würde
   * beim Ziehen einen anderen Wert anzeigen als den, der am Ende gesetzt wird.
   */
  protected roundToStep(value: number): number {
    if (!this.hasSlider || value <= 0) {
      return super.roundToStep(value);
    }
    const speedCount = Math.round(100 / this.step);
    const speedIndex = Math.min(speedCount, Math.max(1, Math.ceil(value / this.step)));
    return Math.round((speedIndex / speedCount) * 100);
  }

  get iconRotateSpeed(): string {
    let speed = 0;
    if (this.hasSlider) {
      if (this.percentage > 0) {
        speed = 3 - ((this.percentage / 100) * 2);
      }
    } else {
      speed = this._value
    }
    
    return `${speed}s`
  }

}
