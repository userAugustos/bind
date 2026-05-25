import { config } from '@core/env';
import { internalError } from '@core/errors';
import { logger } from '@core/logger';

import type {
  AnalysisProvider,
  AnalysisProviderRequest,
  AnalysisProviderResponse,
} from './analysis.provider';

export class ModalAnalysisProvider implements AnalysisProvider {
  readonly name = 'modal';

  async analyze(request: AnalysisProviderRequest): Promise<AnalysisProviderResponse> {
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
        document_id: request.document_id,
        document_type: request.document_type,
        file_name: request.file_name,
      }),
    });

    if (!response.ok) {
      logger.error('Modal provider request failed', {
        status: response.status,
        document_id: request.document_id,
      });
      throw internalError('modal_request_failed', `Modal returned HTTP ${response.status}`);
    }

    const raw_json = await response.text();
    return { raw_json, model_name: response.headers.get('x-model-name') ?? 'modal-unknown' };
  }
}
