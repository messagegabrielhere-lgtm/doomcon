import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countLocs,
  isSitemapIndex,
  extractTitle,
  extractSchemaTypes,
  hasNoindex,
  deriveGaps,
  measureSite,
  formatMarkdown,
  OPEN_ENGINEERING,
  OUR_SURFACES,
  FACET_URL_FLOOR,
  countLocalFacetUrls,
  readLocalReadyUrls,
} from '../tools/seo-daily.mjs';

describe('seo-daily parsers', () => {
  it('monitors conquest and entity hub surfaces until deploy catches up', () => {
    assert.ok(OUR_SURFACES.includes('/vs.html'));
    assert.ok(OUR_SURFACES.includes('/vs/takeofftracker.html'));
    assert.ok(OUR_SURFACES.includes('/guides.html'));
    assert.ok(OUR_SURFACES.includes('/guides.md'));
    assert.ok(OUR_SURFACES.includes('/tags.html'));
    assert.ok(OUR_SURFACES.includes('/companies.html'));
    assert.ok(OUR_SURFACES.includes('/models.html'));
    assert.ok(OUR_SURFACES.includes('/people.html'));
    assert.ok(OUR_SURFACES.includes('/countries.html'));
    assert.ok(OUR_SURFACES.includes('/compare.html'));
    assert.ok(OUR_SURFACES.includes('/history.html'));
    assert.ok(OUR_SURFACES.includes('/lab/artificial-analysis.html'));
    assert.ok(OUR_SURFACES.includes('/about.html'));
    assert.ok(OUR_SURFACES.includes('/privacy.html'));
    assert.ok(OUR_SURFACES.includes('/press.html'));
    assert.ok(OUR_SURFACES.includes('/terms.html'));
    assert.ok(OUR_SURFACES.includes('/disclosures.html'));
    assert.ok(OUR_SURFACES.includes('/brand.html'));
    assert.ok(OUR_SURFACES.includes('/lab/salesforce.html'));
    assert.ok(OUR_SURFACES.includes('/lab/world-labs.html'));
    assert.ok(OUR_SURFACES.includes('/model/nano-banana.html'));
    assert.ok(OUR_SURFACES.includes('/model/jev.html'));
    assert.ok(OUR_SURFACES.includes('/model/dots.html'));
    assert.ok(OUR_SURFACES.includes('/model/embeddinggemma.html'));
    assert.ok(OUR_SURFACES.includes('/model/synthid.html'));
    assert.ok(OUR_SURFACES.includes('/model/clef.html'));
    assert.ok(OUR_SURFACES.includes('/lab/typesafe.html'));
    assert.ok(OUR_SURFACES.includes('/lab/mcdonald-s.html'));
    assert.ok(OUR_SURFACES.includes('/lab/walmart.html'));
    assert.ok(OUR_SURFACES.includes('/lab/netflix.html'));
    assert.ok(OUR_SURFACES.includes('/lab/moonshot-ai.html'));
    assert.ok(OUR_SURFACES.includes('/lab/coreweave.html'));
    assert.ok(OUR_SURFACES.includes('/lab/cognition.html'));
    assert.ok(OUR_SURFACES.includes('/lab/groq.html'));
    assert.ok(OUR_SURFACES.includes('/lab/decart.html'));
    assert.ok(OUR_SURFACES.includes('/lab/iren.html'));
    assert.ok(OUR_SURFACES.includes('/lab/openrouter.html'));
    assert.ok(OUR_SURFACES.includes('/lab/sakana-ai.html'));
    assert.ok(OUR_SURFACES.includes('/lab/physical-intelligence.html'));
    assert.ok(OUR_SURFACES.includes('/lab/zhipu.html'));
    assert.ok(OUR_SURFACES.includes('/lab/cloudflare.html'));
    assert.ok(OUR_SURFACES.includes('/lab/deepseek.html'));
    assert.ok(OUR_SURFACES.includes('/lab/mistral.html'));
    assert.ok(OUR_SURFACES.includes('/lab/amd.html'));
    assert.ok(OUR_SURFACES.includes('/lab/broadcom.html'));
    assert.ok(OUR_SURFACES.includes('/lab/oracle.html'));
    assert.ok(OUR_SURFACES.includes('/lab/tencent.html'));
    assert.ok(OUR_SURFACES.includes('/lab/qwen.html'));
    assert.ok(OUR_SURFACES.includes('/lab/qualcomm.html'));
    assert.ok(OUR_SURFACES.includes('/lab/microsoft.html'));
    assert.ok(OUR_SURFACES.includes('/lab/nvidia.html'));
    assert.ok(OUR_SURFACES.includes('/lab/amazon.html'));
    assert.ok(OUR_SURFACES.includes('/lab/hugging-face.html'));
    assert.ok(OUR_SURFACES.includes('/lab/reflection-ai.html'));
    assert.ok(OUR_SURFACES.includes('/lab/apple.html'));
    assert.ok(OUR_SURFACES.includes('/lab/palantir.html'));
    assert.ok(OUR_SURFACES.includes('/lab/bytedance.html'));
    assert.ok(OUR_SURFACES.includes('/lab/softbank.html'));
    assert.ok(OUR_SURFACES.includes('/lab/adobe.html'));
    assert.ok(OUR_SURFACES.includes('/lab/cisco.html'));
    assert.ok(OUR_SURFACES.includes('/lab/intel.html'));
    assert.ok(OUR_SURFACES.includes('/lab/samsung.html'));
    assert.ok(OUR_SURFACES.includes('/lab/supermicro.html'));
    assert.ok(OUR_SURFACES.includes('/lab/tsmc.html'));
    assert.ok(OUR_SURFACES.includes('/lab/huawei.html'));
    assert.ok(OUR_SURFACES.includes('/lab/sony.html'));
    assert.ok(OUR_SURFACES.includes('/lab/tesla.html'));
    assert.ok(OUR_SURFACES.includes('/lab/waymo.html'));
    assert.ok(OUR_SURFACES.includes('/lab/asml.html'));
    assert.ok(OUR_SURFACES.includes('/lab/micron.html'));
    assert.ok(OUR_SURFACES.includes('/lab/winverse-ai.html'));
    assert.ok(OUR_SURFACES.includes('/lab/isomorphic-labs.html'));
    assert.ok(OUR_SURFACES.includes('/lab/openai.html'));
    assert.ok(OUR_SURFACES.includes('/lab/anthropic.html'));
    assert.ok(OUR_SURFACES.includes('/lab/meta.html'));
    assert.ok(OUR_SURFACES.includes('/lab/google-deepmind.html'));
    assert.ok(OUR_SURFACES.includes('/lab/xai.html'));
    assert.ok(OUR_SURFACES.includes('/model/claude.html'));
    assert.ok(OUR_SURFACES.includes('/model/gpt.html'));
    assert.ok(OUR_SURFACES.includes('/model/gemini.html'));
    assert.ok(OUR_SURFACES.includes('/model/qwen.html'));
    assert.ok(OUR_SURFACES.includes('/model/deepseek-r.html'));
    assert.ok(OUR_SURFACES.includes('/model/llama.html'));
    assert.ok(OUR_SURFACES.includes('/model/gemma.html'));
    assert.ok(OUR_SURFACES.includes('/people/nadella.html'));
    assert.ok(OUR_SURFACES.includes('/people/altman.html'));
    assert.ok(OUR_SURFACES.includes('/people/musk.html'));
    assert.ok(OUR_SURFACES.includes('/people/amodei.html'));
    assert.ok(OUR_SURFACES.includes('/people/huang.html'));
    assert.ok(OUR_SURFACES.includes('/people/zuckerberg.html'));
    assert.ok(OUR_SURFACES.includes('/people/brockman.html'));
    assert.ok(OUR_SURFACES.includes('/people/lecun.html'));
    assert.ok(OUR_SURFACES.includes('/people/karpathy.html'));
    assert.ok(OUR_SURFACES.includes('/people/bengio.html'));
    assert.ok(OUR_SURFACES.includes('/people/pichai.html'));
    assert.ok(OUR_SURFACES.includes('/people/hassabis.html'));
    assert.ok(OUR_SURFACES.includes('/people/sutskever.html'));
    assert.ok(OUR_SURFACES.includes('/people/suleyman.html'));
    assert.ok(OUR_SURFACES.includes('/people/liang.html'));
    assert.ok(OUR_SURFACES.includes('/people/hinton.html'));
    assert.ok(OUR_SURFACES.includes('/people/karp.html'));
    assert.ok(OUR_SURFACES.includes('/people/murati.html'));
    assert.ok(OUR_SURFACES.includes('/people/mensch.html'));
    assert.ok(OUR_SURFACES.includes('/people/kavukcuoglu.html'));
    assert.ok(OUR_SURFACES.includes('/kind/press.html'));
    assert.ok(OUR_SURFACES.includes('/kind/paper.html'));
    assert.ok(OUR_SURFACES.includes('/kind/forum.html'));
    assert.ok(OUR_SURFACES.includes('/kind/lab.html'));
    assert.ok(OUR_SURFACES.includes('/kind/release.html'));
    assert.ok(OUR_SURFACES.includes('/kind/model.html'));
    assert.ok(OUR_SURFACES.includes('/kind/status.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/arxiv-org.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/huggingface-co.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/techmeme-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/reddit-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/theverge-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/github-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/bloomberg-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/techcrunch-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/theguardian-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/arstechnica-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/ft-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/lesswrong-com.html'));
    assert.ok(OUR_SURFACES.includes('/tags/neural-networks.html'));
    assert.ok(OUR_SURFACES.includes('/tags/visual-language.html'));
    assert.ok(OUR_SURFACES.includes('/tags/chatgpt.html'));
    assert.ok(OUR_SURFACES.includes('/tags/learning-rate.html'));
    assert.ok(OUR_SURFACES.includes('/tags/agents.html'));
    assert.ok(OUR_SURFACES.includes('/tags/gpus.html'));
    assert.ok(OUR_SURFACES.includes('/tags/china.html'));
    assert.ok(OUR_SURFACES.includes('/tags/startups.html'));
    assert.ok(OUR_SURFACES.includes('/tags/reinforcement-learning.html'));
    assert.ok(OUR_SURFACES.includes('/tags/inference.html'));
    assert.ok(OUR_SURFACES.includes('/tags/safety.html'));
    assert.ok(OUR_SURFACES.includes('/tags/robotics.html'));
    assert.ok(OUR_SURFACES.includes('/tags/fine-tuning.html'));
    assert.ok(OUR_SURFACES.includes('/tags/distillation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/chips.html'));
    assert.ok(OUR_SURFACES.includes('/tags/fundraising.html'));
    assert.ok(OUR_SURFACES.includes('/tags/multimodal.html'));
    assert.ok(OUR_SURFACES.includes('/tags/benchmarks.html'));
    assert.ok(OUR_SURFACES.includes('/tags/finance.html'));
    assert.ok(OUR_SURFACES.includes('/tags/open-weights.html'));
    assert.ok(OUR_SURFACES.includes('/tags/datacenters.html'));
    assert.ok(OUR_SURFACES.includes('/tags/education.html'));
    assert.ok(OUR_SURFACES.includes('/tags/healthcare.html'));
    assert.ok(OUR_SURFACES.includes('/tags/llm-agents.html'));
    assert.ok(OUR_SURFACES.includes('/tags/world-models.html'));
    assert.ok(OUR_SURFACES.includes('/tags/acquisitions.html'));
    assert.ok(OUR_SURFACES.includes('/tags/post-training.html'));
    assert.ok(OUR_SURFACES.includes('/tags/multi-agent.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/wsj-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/reuters-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/yahoo-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/36kr-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/openai-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/the-decoder-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/wired-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/biggo-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/simplywall-st.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/aws-amazon-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/nytimes-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/cryptobriefing-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/scmp-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/ad-hoc-news-de.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/chosun-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/newsbytesapp-com.html'));
    assert.ok(OUR_SURFACES.includes('/tags/coding.html'));
    assert.ok(OUR_SURFACES.includes('/tags/regulation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/foundation-models.html'));
    assert.ok(OUR_SURFACES.includes('/tags/labor.html'));
    assert.ok(OUR_SURFACES.includes('/tags/vision-language.html'));
    assert.ok(OUR_SURFACES.includes('/tags/security.html'));
    assert.ok(OUR_SURFACES.includes('/tags/diffusion.html'));
    assert.ok(OUR_SURFACES.includes('/tags/ai-chips.html'));
    assert.ok(OUR_SURFACES.includes('/tags/military.html'));
    assert.ok(OUR_SURFACES.includes('/tags/ipo.html'));
    assert.ok(OUR_SURFACES.includes('/tags/cloud.html'));
    assert.ok(OUR_SURFACES.includes('/tags/embeddings.html'));
    assert.ok(OUR_SURFACES.includes('/tags/video-generation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/huggingface.html'));
    assert.ok(OUR_SURFACES.includes('/tags/on-policy-distillation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/coding-agents.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/cnbc-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/pasqualepillitteri-it.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/theglobeandmail-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/latent-space.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/news-mit-edu.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/simonwillison-net.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/tradingview-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/bbc-co-uk.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/benzinga-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/infoq-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/nature-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/technologyreview-com.html'));
    assert.ok(OUR_SURFACES.includes('/source/gnews-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/arxiv-newest.html'));
    assert.ok(OUR_SURFACES.includes('/source/hf-daily-papers.html'));
    assert.ok(OUR_SURFACES.includes('/source/techmeme.html'));
    assert.ok(OUR_SURFACES.includes('/source/hn-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/wires-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/reddit-artificial.html'));
    assert.ok(OUR_SURFACES.includes('/source/verge-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/bluesky-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/reddit-singularity.html'));
    assert.ok(OUR_SURFACES.includes('/source/github-releases.html'));
    assert.ok(OUR_SURFACES.includes('/source/techcrunch-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/guardian-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/arstechnica-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/reddit-controlproblem.html'));
    assert.ok(OUR_SURFACES.includes('/source/lesswrong.html'));
    assert.ok(OUR_SURFACES.includes('/source/hn-fresh-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/reddit-chatgpt.html'));
    assert.ok(OUR_SURFACES.includes('/source/reddit-openai.html'));
    assert.ok(OUR_SURFACES.includes('/source/reddit-localllama.html'));
    assert.ok(OUR_SURFACES.includes('/tags/quantization.html'));
    assert.ok(OUR_SURFACES.includes('/tags/training-data.html'));
    assert.ok(OUR_SURFACES.includes('/tags/pretraining.html'));
    assert.ok(OUR_SURFACES.includes('/tags/voice.html'));
    assert.ok(OUR_SURFACES.includes('/tags/reasoning.html'));
    assert.ok(OUR_SURFACES.includes('/tags/moe.html'));
    assert.ok(OUR_SURFACES.includes('/tags/vision-language-action.html'));
    assert.ok(OUR_SURFACES.includes('/tags/time-series.html'));
    assert.ok(OUR_SURFACES.includes('/tags/long-context.html'));
    assert.ok(OUR_SURFACES.includes('/tags/browser.html'));
    assert.ok(OUR_SURFACES.includes('/tags/kv-cache.html'));
    assert.ok(OUR_SURFACES.includes('/tags/rag.html'));
    assert.ok(OUR_SURFACES.includes('/tags/frontier-models.html'));
    assert.ok(OUR_SURFACES.includes('/tags/self-distillation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/world-action.html'));
    assert.ok(OUR_SURFACES.includes('/tags/watermarking.html'));
    assert.ok(OUR_SURFACES.includes('/source/the-decoder.html'));
    assert.ok(OUR_SURFACES.includes('/source/openai.html'));
    assert.ok(OUR_SURFACES.includes('/source/reddit-machinelearning.html'));
    assert.ok(OUR_SURFACES.includes('/source/bloomberg-tech.html'));
    assert.ok(OUR_SURFACES.includes('/source/mit-news-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/huggingface-blog.html'));
    assert.ok(OUR_SURFACES.includes('/source/nyt-tech.html'));
    assert.ok(OUR_SURFACES.includes('/source/hf-trending-models.html'));
    assert.ok(OUR_SURFACES.includes('/source/wired-ai.html'));
    assert.ok(OUR_SURFACES.includes('/source/aws-ml.html'));
    assert.ok(OUR_SURFACES.includes('/source/bbc-tech.html'));
    assert.ok(OUR_SURFACES.includes('/source/latent-space.html'));
    assert.ok(OUR_SURFACES.includes('/source/reddit-technology.html'));
    assert.ok(OUR_SURFACES.includes('/source/nvidia-blog.html'));
    assert.ok(OUR_SURFACES.includes('/source/anthropic-status.html'));
    assert.ok(OUR_SURFACES.includes('/source/deepmind.html'));
    assert.ok(OUR_SURFACES.includes('/source/simon-willison.html'));
    assert.ok(OUR_SURFACES.includes('/tags/image-generation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/embodied.html'));
    assert.ok(OUR_SURFACES.includes('/tags/tool-use.html'));
    assert.ok(OUR_SURFACES.includes('/tags/memory.html'));
    assert.ok(OUR_SURFACES.includes('/tags/computer-use.html'));
    assert.ok(OUR_SURFACES.includes('/tags/rlvr.html'));
    assert.ok(OUR_SURFACES.includes('/tags/flow-matching.html'));
    assert.ok(OUR_SURFACES.includes('/tags/hallucination.html'));
    assert.ok(OUR_SURFACES.includes('/tags/claude-code.html'));
    assert.ok(OUR_SURFACES.includes('/tags/chain-of-thought.html'));
    assert.ok(OUR_SURFACES.includes('/tags/small-models.html'));
    assert.ok(OUR_SURFACES.includes('/tags/autoencoders.html'));
    assert.ok(OUR_SURFACES.includes('/tags/copilot.html'));
    assert.ok(OUR_SURFACES.includes('/tags/diffusion-llm.html'));
    assert.ok(OUR_SURFACES.includes('/tags/ai-infrastructure.html'));
    assert.ok(OUR_SURFACES.includes('/tags/context-window.html'));
    assert.ok(OUR_SURFACES.includes('/tags/ollama.html'));
    assert.ok(OUR_SURFACES.includes('/tags/mcp.html'));
    assert.ok(OUR_SURFACES.includes('/tags/lora.html'));
    assert.ok(OUR_SURFACES.includes('/tags/grpo.html'));
    assert.ok(OUR_SURFACES.includes('/tags/in-context.html'));
    assert.ok(OUR_SURFACES.includes('/tags/video-world-models.html'));
    assert.ok(OUR_SURFACES.includes('/tags/sft.html'));
    assert.ok(OUR_SURFACES.includes('/tags/asr.html'));
    assert.ok(OUR_SURFACES.includes('/tags/autonomous-vehicles.html'));
    assert.ok(OUR_SURFACES.includes('/tags/skills.html'));
    assert.ok(OUR_SURFACES.includes('/tags/humanoid.html'));
    assert.ok(OUR_SURFACES.includes('/tags/tool-calling.html'));
    assert.ok(OUR_SURFACES.includes('/tags/latent-space.html'));
    assert.ok(OUR_SURFACES.includes('/tags/slm.html'));
    assert.ok(OUR_SURFACES.includes('/tags/interpretability.html'));
    assert.ok(OUR_SURFACES.includes('/tags/sparsity.html'));
    assert.ok(OUR_SURFACES.includes('/tags/open-models.html'));
    assert.ok(OUR_SURFACES.includes('/tags/transformers.html'));
    assert.ok(OUR_SURFACES.includes('/tags/guardrails.html'));
    assert.ok(OUR_SURFACES.includes('/tags/ai-music.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/investing-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/digitaltoday-co-kr.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/gurufocus-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/ndtvprofit-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/startupfortune-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/indiatimes-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/moneycontrol-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/seekingalpha-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/ababnews-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/mashable-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/ndtv-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/qz-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/washingtonpost-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/apnews-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/bioengineer-org.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/businessinsider-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/dealroom-co.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/fool-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/theatlantic-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/barrons-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/business-standard-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/economictimes-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/journalarta-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/nacionale-com.html'));
    assert.ok(OUR_SURFACES.includes('/tags/tokenization.html'));
    assert.ok(OUR_SURFACES.includes('/tags/robot-learning.html'));
    assert.ok(OUR_SURFACES.includes('/tags/reward-models.html'));
    assert.ok(OUR_SURFACES.includes('/tags/linear-attention.html'));
    assert.ok(OUR_SURFACES.includes('/tags/test-time.html'));
    assert.ok(OUR_SURFACES.includes('/tags/federated-learning.html'));
    assert.ok(OUR_SURFACES.includes('/tags/alignment.html'));
    assert.ok(OUR_SURFACES.includes('/tags/reasoning-models.html'));
    assert.ok(OUR_SURFACES.includes('/tags/provenance.html'));
    assert.ok(OUR_SURFACES.includes('/tags/energy.html'));
    assert.ok(OUR_SURFACES.includes('/tags/evals.html'));
    assert.ok(OUR_SURFACES.includes('/tags/video.html'));
    assert.ok(OUR_SURFACES.includes('/tags/copyright.html'));
    assert.ok(OUR_SURFACES.includes('/tags/deepfakes.html'));
    assert.ok(OUR_SURFACES.includes('/tags/ai-science.html'));
    assert.ok(OUR_SURFACES.includes('/tags/physical-ai.html'));
    assert.ok(OUR_SURFACES.includes('/tags/gui-agents.html'));
    assert.ok(OUR_SURFACES.includes('/tags/local-llm.html'));
    assert.ok(OUR_SURFACES.includes('/tags/tts.html'));
    assert.ok(OUR_SURFACES.includes('/tags/text-to-image.html'));
    assert.ok(OUR_SURFACES.includes('/tags/reasoning-traces.html'));
    assert.ok(OUR_SURFACES.includes('/tags/mlx.html'));
    assert.ok(OUR_SURFACES.includes('/tags/continual-learning.html'));
    assert.ok(OUR_SURFACES.includes('/tags/self-attention.html'));
    assert.ok(OUR_SURFACES.includes('/tags/ai-act.html'));
    assert.ok(OUR_SURFACES.includes('/tags/inference-cost.html'));
    assert.ok(OUR_SURFACES.includes('/tags/prefer-data.html'));
    assert.ok(OUR_SURFACES.includes('/tags/voice-agents.html'));
    assert.ok(OUR_SURFACES.includes('/tags/mcp-servers.html'));
    assert.ok(OUR_SURFACES.includes('/tags/deep-research.html'));
    assert.ok(OUR_SURFACES.includes('/tags/activation-steering.html'));
    assert.ok(OUR_SURFACES.includes('/tags/rerank.html'));
    assert.ok(OUR_SURFACES.includes('/tags/agent-memory.html'));
    assert.ok(OUR_SURFACES.includes('/tags/locomotion.html'));
    assert.ok(OUR_SURFACES.includes('/tags/speculative-decoding.html'));
    assert.ok(OUR_SURFACES.includes('/tags/blackwell.html'));
    assert.ok(OUR_SURFACES.includes('/tags/agentic-workflow.html'));
    assert.ok(OUR_SURFACES.includes('/tags/leaderboard.html'));
    assert.ok(OUR_SURFACES.includes('/tags/model-merging.html'));
    assert.ok(OUR_SURFACES.includes('/tags/open-source-ai.html'));
    assert.ok(OUR_SURFACES.includes('/tags/research-agents.html'));
    assert.ok(OUR_SURFACES.includes('/tags/conversational-ai.html'));
    assert.ok(OUR_SURFACES.includes('/tags/humanoid-robots.html'));
    assert.ok(OUR_SURFACES.includes('/tags/dexterous-manipulation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/prompt-injection.html'));
    assert.ok(OUR_SURFACES.includes('/tags/ai-search.html'));
    assert.ok(OUR_SURFACES.includes('/tags/synthetic-data.html'));
    assert.ok(OUR_SURFACES.includes('/tags/openrouter.html'));
    assert.ok(OUR_SURFACES.includes('/tags/system-prompts.html'));
    assert.ok(OUR_SURFACES.includes('/tags/voice-ai.html'));
    assert.ok(OUR_SURFACES.includes('/tags/multimodal-reasoning.html'));
    assert.ok(OUR_SURFACES.includes('/tags/domain-adaptation.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/storyboard18-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/tipranks-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/businessworld-in.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/geeky-gadgets-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/livemint-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/neowin-net.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/officechai-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/rswebsols-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/tech-insider-org.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/telegraph-co-uk.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/thenews-com-pk.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/theregister-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/trendhunter-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/404media-co.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/axios-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/calcalistech-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/fastcompany-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/independent-co-uk.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/inshorts-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/mixed-news-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/ntd-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/pcmag-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/pymnts-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/streamlinefeed-co-ke.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/techbuzz-ai.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/thenextweb-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/tomshardware-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/tradingkey-com.html'));
    assert.ok(OUR_SURFACES.includes('/outlet/ynetnews-com.html'));
    assert.ok(OUR_SURFACES.includes('/model/kimi.html'));
    assert.ok(OUR_SURFACES.includes('/model/glm.html'));
    assert.ok(OUR_SURFACES.includes('/model/grok.html'));
    assert.ok(OUR_SURFACES.includes('/model/muse-wonder.html'));
    assert.ok(OUR_SURFACES.includes('/tags/on-policy.html'));
    assert.ok(OUR_SURFACES.includes('/tags/long-horizon.html'));
    assert.ok(OUR_SURFACES.includes('/tags/compositional.html'));
    assert.ok(OUR_SURFACES.includes('/tags/latent.html'));
    assert.ok(OUR_SURFACES.includes('/tags/autoregressive.html'));
    assert.ok(OUR_SURFACES.includes('/tags/simulation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/reward-model.html'));
    assert.ok(OUR_SURFACES.includes('/tags/graph-neural.html'));
    assert.ok(OUR_SURFACES.includes('/tags/generalization.html'));
    assert.ok(OUR_SURFACES.includes('/tags/uncertainty.html'));
    assert.ok(OUR_SURFACES.includes('/tags/calibration.html'));
    assert.ok(OUR_SURFACES.includes('/tags/conformal.html'));
    assert.ok(OUR_SURFACES.includes('/tags/trajectory.html'));
    assert.ok(OUR_SURFACES.includes('/tags/causal.html'));
    assert.ok(OUR_SURFACES.includes('/tags/federated.html'));
    assert.ok(OUR_SURFACES.includes('/tags/counterfactual.html'));
    assert.ok(OUR_SURFACES.includes('/tags/retrieval.html'));
    assert.ok(OUR_SURFACES.includes('/tags/3d.html'));
    assert.ok(OUR_SURFACES.includes('/tags/personalization.html'));
    assert.ok(OUR_SURFACES.includes('/tags/pruning.html'));
    assert.ok(OUR_SURFACES.includes('/tags/steering.html'));
    assert.ok(OUR_SURFACES.includes('/tags/prefill.html'));
    assert.ok(OUR_SURFACES.includes('/tags/financial.html'));
    assert.ok(OUR_SURFACES.includes('/tags/evaluation.html'));
    assert.ok(OUR_SURFACES.includes('/tags/serving.html'));
    assert.ok(OUR_SURFACES.includes('/tags/bayesian.html'));
    assert.ok(OUR_SURFACES.includes('/tags/reliability.html'));
    assert.ok(OUR_SURFACES.includes('/tags/observability.html'));
    assert.ok(OUR_SURFACES.includes('/tags/verifier.html'));
    assert.ok(OUR_SURFACES.includes('/tags/softmax.html'));
    assert.ok(OUR_SURFACES.includes('/tags/throughput.html'));
    assert.ok(OUR_SURFACES.includes('/tags/latency.html'));
    assert.ok(OUR_SURFACES.includes('/tags/logits.html'));
    assert.ok(OUR_SURFACES.includes('/tags/adversarial.html'));
    assert.ok(OUR_SURFACES.includes('/tags/robustness.html'));
    assert.ok(OUR_SURFACES.includes('/tags/contrastive.html'));
    assert.ok(OUR_SURFACES.includes('/tags/gradient.html'));
    assert.ok(OUR_SURFACES.includes('/tags/optimizer.html'));
    assert.ok(OUR_SURFACES.includes('/tags/regularization.html'));
    assert.ok(OUR_SURFACES.includes('/tags/attribution.html'));
    assert.ok(OUR_SURFACES.includes('/tags/normalization.html'));
    assert.ok(OUR_SURFACES.includes('/tags/gigawatt.html'));
    assert.ok(OUR_SURFACES.includes('/tags/next-token.html'));
    assert.ok(OUR_SURFACES.includes('/tags/catastrophic-forgetting.html'));
    assert.ok(OUR_SURFACES.includes('/tags/unsupervised.html'));
    assert.ok(OUR_SURFACES.includes('/tags/backdoor.html'));
    assert.ok(OUR_SURFACES.includes('/tags/out-of-distribution.html'));
    assert.ok(OUR_SURFACES.includes('/tags/disentanglement.html'));
    assert.ok(OUR_SURFACES.includes('/jobs.html'));
    assert.ok(OUR_SURFACES.includes('/medicine.html'));
  });

  it('counts sitemap locs and detects indexes', () => {
    assert.equal(countLocs('<urlset><url><loc>https://a/1</loc></url><url><loc>https://a/2</loc></url></urlset>'), 2);
    assert.equal(countLocs(''), 0);
    assert.equal(isSitemapIndex('<sitemapindex><sitemap><loc>https://a/s.xml</loc></sitemap></sitemapindex>'), true);
    assert.equal(isSitemapIndex('<urlset><url><loc>https://a/1</loc></url></urlset>'), false);
  });

  it('extracts title and JSON-LD types', () => {
    const html = `<title>\n  AI activity index today · SIREN\n</title>
      <script type="application/ld+json">{"@type":"WebSite"}</script>
      <script type="application/ld+json">{"@graph":[{"@type":["FAQPage","BreadcrumbList"]}]}</script>`;
    assert.equal(extractTitle(html), 'AI activity index today · SIREN');
    assert.deepEqual(extractSchemaTypes(html), ['BreadcrumbList', 'FAQPage', 'WebSite']);
  });

  it('decodes title entities in one pass without chained unescaping', () => {
    assert.equal(
      extractTitle('<title>DEFCON &amp; Doomsday Clock</title>'),
      'DEFCON & Doomsday Clock',
    );
    assert.equal(
      extractTitle('<title>A &amp;lt; B &#39;quote&#39;</title>'),
      'A &lt; B \'quote\'',
    );
  });

  it('detects noindex', () => {
    assert.equal(hasNoindex('<meta name="robots" content="noindex, follow">'), true);
    assert.equal(hasNoindex('<meta name="description" content="x">'), false);
  });
});

describe('seo-daily measure + gaps', () => {
  it('measures a site from a fetch map', () => {
    const byUrl = new Map([
      ['https://siren.watch/', { ok: true, value: '<title>SIREN</title><script type="application/ld+json">{"@type":"Dataset"}</script>' }],
      ['https://siren.watch/sitemap.xml', { ok: true, value: '<urlset><url><loc>https://siren.watch/a</loc></url></urlset>' }],
      ['https://siren.watch/news-sitemap.xml', { ok: true, value: '<urlset><url><loc>https://siren.watch/item/a</loc></url></urlset>' }],
      ['https://siren.watch/robots.txt', { ok: true, value: 'User-agent: *\nAllow: /\n' }],
      ['https://siren.watch/llms.txt', { ok: true, value: '# SIREN\n' }],
    ]);
    const row = measureSite(
      { id: 'siren', name: 'siren.watch', origin: 'https://siren.watch', ours: true },
      byUrl,
    );
    assert.equal(row.ok, true);
    assert.equal(row.sitemap_urls, 1);
    assert.equal(row.news_sitemap_urls, 1);
    assert.equal(row.llms_ok, true);
    assert.deepEqual(row.schema_types, ['Dataset']);
  });

  it('flags rival URL lead, empty news sitemap, and dead surfaces', () => {
    const gaps = deriveGaps({
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 400, news_sitemap_urls: 0, schema_types: [],
        },
        {
          id: 'doombench', name: 'DoomBench', ours: false, ok: true,
          title: 'x', sitemap_urls: 2000, news_sitemap_urls: null, schema_types: [],
        },
      ],
      surfaces: [{ path: '/agents.md', ok: false, status: 500 }],
      open_engineering: OPEN_ENGINEERING.slice(0, 1),
    });
    const ids = gaps.map((g) => g.id);
    assert.ok(ids.includes('news-sitemap-empty'));
    assert.ok(ids.includes('trail-doombench-urls'));
    assert.ok(ids.includes('surface-/agents.md'));
    assert.ok(ids.includes('open-gsc-verify'));
  });

  it('prefers deploy-pending when the local tree already beats rivals', () => {
    const gaps = deriveGaps({
      sites: [
        {
          id: 'siren', name: 'siren.watch', ours: true, ok: true,
          title: 'AI activity index today', sitemap_urls: 683, news_sitemap_urls: 100, schema_types: [],
        },
        {
          id: 'doombench', name: 'DoomBench', ours: false, ok: true,
          title: 'x', sitemap_urls: 2088, news_sitemap_urls: null, schema_types: [],
        },
      ],
      local_ready: { live: 800, archived: 5000, estimated_sitemap: 6250 },
      surfaces: [],
      open_engineering: [],
    });
    const ids = gaps.map((g) => g.id);
    assert.ok(ids.includes('deploy-pending-url-lead'));
    assert.ok(!ids.includes('trail-doombench-urls'));
  });

  it('renders markdown scoreboard', () => {
    const md = formatMarkdown({
      measured_at: '2026-10-12T12:00:00.000Z',
      sites: [{
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'SIREN', sitemap_urls: 600, news_sitemap_urls: 40,
        schema_types: ['WebSite'], llms_ok: true,
      }],
      surfaces: [{ path: '/llms.txt', ok: true, bytes: 1200 }],
      gaps: [{ id: 'x', severity: 'low', text: 'example' }],
    });
    assert.match(md, /SEO scoreboard/);
    assert.match(md, /\*\*siren\.watch\*\*/);
    assert.match(md, /example/);
  });

  it('counts local facet sitemap rows and keeps a floor on the ready estimate', async () => {
    assert.equal(FACET_URL_FLOOR, 450);
    const facets = await countLocalFacetUrls();
    assert.ok(Number.isFinite(facets) && facets >= 300, `facet count ${facets}`);
    // world.json + routes.world must be wired so /country/* rows are counted
    // (countryPages.sitemapEntries returns [] without them). Real count should
    // clear the floor once countries are included (~70 gated ISO pages).
    assert.ok(facets > FACET_URL_FLOOR, `facet count with countries ${facets}`);
    const ready = await readLocalReadyUrls();
    assert.ok(ready);
    assert.ok(ready.live >= 100);
    assert.ok(ready.archived >= 1000);
    assert.ok(ready.facets >= FACET_URL_FLOOR);
    assert.ok(ready.facets === facets || ready.facets === FACET_URL_FLOOR);
    assert.equal(ready.estimated_sitemap, ready.live + ready.archived + ready.facets);
  });
});
