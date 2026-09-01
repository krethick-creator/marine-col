import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { groqModelRouter } from '../llm/GroqModelRouter'

export interface CommunityIntelligenceResult {
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH'
  summary: string
  conditions: string[]
  hotspots: string[]
  fishingActivity: 'LOW' | 'MODERATE' | 'HIGH'
  recommendation: string
}

export async function analyzeCommunityReports(
  reports: any[],
): Promise<CommunityIntelligenceResult> {

  if (!reports || reports.length === 0) {
    return {
      riskLevel: 'LOW',
      summary: 'There are no community reports available for analysis.',
      conditions: [],
      hotspots: [],
      fishingActivity: 'LOW',
      recommendation: 'Continue monitoring the community feed.',
    }
  }

  const reportText = reports
    .slice(0, 30)
    .map((report, index) => {
      return `
REPORT ${index + 1}
Type: ${report.postType}
Title: ${report.title}
Content: ${report.content}
Location: ${report.locationName || 'Unknown'}
Verified: ${report.isVerified ? 'Yes' : 'No'}
`
    })
    .join('\n')

  const systemPrompt = `
You are ORCA Community Intelligence Agent.

You analyze reports submitted by fishermen.

Your job is to identify patterns in the reports and convert them into
useful marine intelligence.

IMPORTANT:
- Community reports are NOT official government data.
- Never claim that a community observation is officially verified.
- Do not invent weather, ocean or satellite measurements.
- Only use information present in the reports.
- If information is insufficient, say so.

Return ONLY valid JSON in this exact structure:

{
  "riskLevel": "LOW",
  "summary": "short summary",
  "conditions": ["condition 1", "condition 2"],
  "hotspots": ["location 1"],
  "fishingActivity": "LOW",
  "recommendation": "short practical recommendation"
}

riskLevel must be LOW, MODERATE or HIGH.

fishingActivity must be LOW, MODERATE or HIGH.
`

  const userPrompt = `
Analyze these community reports:

${reportText}
`

  const result = await groqModelRouter.invoke(
    [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ],
    'general',
  )

  try {
    const cleaned = result.response
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    return {
      riskLevel:
        parsed.riskLevel === 'HIGH' ||
        parsed.riskLevel === 'MODERATE'
          ? parsed.riskLevel
          : 'LOW',

      summary:
        typeof parsed.summary === 'string'
          ? parsed.summary
          : 'Community reports analyzed.',

      conditions:
        Array.isArray(parsed.conditions)
          ? parsed.conditions.slice(0, 6)
          : [],

      hotspots:
        Array.isArray(parsed.hotspots)
          ? parsed.hotspots.slice(0, 6)
          : [],

      fishingActivity:
        parsed.fishingActivity === 'HIGH' ||
        parsed.fishingActivity === 'MODERATE'
          ? parsed.fishingActivity
          : 'LOW',

      recommendation:
        typeof parsed.recommendation === 'string'
          ? parsed.recommendation
          : 'Continue monitoring community reports.',
    }
  } catch (error) {
    console.error(
      '[Community Intelligence] Failed to parse AI response:',
      error,
    )

    throw new Error(
      'Community intelligence analysis could not be generated.',
    )
  }
}