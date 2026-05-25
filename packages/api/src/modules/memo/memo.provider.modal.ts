import { config } from '@core/env';
import { internalError } from '@core/errors';
import { logger } from '@core/logger';

import type { MemoProvider, MemoProviderRequest, MemoProviderResponse } from './memo.provider';

export class ModalMemoProvider implements MemoProvider {
  readonly name = 'modal';

  async generate(request: MemoProviderRequest): Promise<MemoProviderResponse> {
    const { endpoint, key, secret } = config.modal;
    if (!endpoint || !key || !secret) {
      throw internalError(
        'modal_not_configured',
        'Modal provider is not configured. Set MODAL_ENDPOINT, MODAL_KEY, MODAL_SECRET.'
      );
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Modal-Key': key,
        'Modal-Secret': secret,
      },
      body: JSON.stringify({
        task: 'proposal_memo',
        case_name: request.case_name,
        client_name: request.client_name,
        comparison_result: request.comparison_result,
        policy_check_summaries: request.policy_check_summaries,
      }),
    });

    if (!response.ok) {
      logger.error('Modal memo provider request failed', {
        status: response.status,
        case_name: request.case_name,
      });
      throw internalError('modal_request_failed', `Modal returned HTTP ${response.status}`);
    }

    const raw_json = await response.text();
    return { raw_json, model_name: response.headers.get('x-model-name') ?? 'modal-unknown' };
  }
}
