import styled from "styled-components";
import highlightImage from '../../images/highlight.png';

const breakpoints = {
  sm: '640px',
  md: '960px',
};

// Fluid padding: min 32px → ideal 20vw → max 245px
export const HeroContainer = styled.div`
  background: ${({ theme }) => theme.card_light};
  display: flex;
  justify-content: center;
  position: relative;
  padding: clamp(32px, 20vw, 245px) clamp(16px, 5vw, 30px);
  z-index: 1;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 70% 95%, 0 100%);
`;

export const HeroBg = styled.div`
  position: absolute;
  inset: 0;               /* shorthand for top/right/bottom/left = 0 */
  max-width: 1360px;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  padding-inline: clamp(0px, 5vw, 30px);

  /* center on small screens */
  @media (max-width: ${breakpoints.md}) {
    justify-content: center;
    padding-inline: 0;
  }
`;

export const HeroInnerContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1100px;

  @media (max-width: ${breakpoints.md}) {
    flex-direction: column;
    gap: clamp(16px, 4vw, 30px);
  }
`;

export const HeroLeftContainer = styled.div`
	width:100%;
	order: 1;

  @media (max-width: ${breakpoints.md}) {
    order: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
	width: 1000px;
  }
`;

export const Img = styled.img`
  width: clamp(280px, 30vw, 400px);
  height: auto;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.primary};
`;

export const Title = styled.h1`
  font-weight: 700;
  font-size: clamp(2rem, 5vw, 50px);
  line-height: clamp(2.5rem, 6vw, 68px);
  color: ${({ theme }) => theme.text_primary};
  text-align: center;
`;

export const TextLoop = styled.div`
  font-weight: 700;
  font-size: clamp(1rem, 3vw, 30px);
  line-height: clamp(2.5rem, 5vw, 68px);
  display: flex;
  gap: clamp(4px, 1vw, 12px);
  color: ${({ theme }) => theme.text_primary};
  text-align: center;
  justify-content: center;
  align-items: center;
  @media (max-width: 768px) {
        font-size: 10px;
  }
`;

export const Span = styled.span`
  cursor: pointer;
  color: #fff;
  display: inline-flex;
  align-items: center;
  background: url(${highlightImage}) no-repeat center;
  @media (max-width: 768px) {
        font-size: 10px;
		background: "None";
  }
`;

export const SubTitle = styled.p`
  font-size: clamp(0.75rem, 2vw, 20px);
  line-height: clamp(1rem, 3vw, 32px);
  margin-bottom: clamp(18px, 6vw, 44px);
  color: ${({ theme }) => theme.text_primary + '95'};
  text-align: center;
  @media (max-width: 768px) {
        font-size: 11px;
  }
`;

export const CenteredContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const ResumeButton = styled.a`
    -webkit-appearance: button;
    -moz-appearance: button;
    appearance: button;
    text-decoration: none;
    width: 200px;
    max-width: 300px;
    text-align: center;
    justify-content: center;
    align-items: center;    
    padding: 16px 0;
    color:${({ theme }) => theme.white};
    border-radius: 20px;
    cursor: pointer;
    font-size: 20px;
    font-weight: 600;
    color: black;
    transition: all 0.2s ease-in-out !important;
    background: #A1FFA5;

    &:hover {
        transform: scale(1.05);
		transition: all 0.4s ease-in-out;
		box-shadow:  20px 20px 60px #1F2634,
		filter: brightness(1);
    }    
    
    
    @media (max-width: 640px) {
        padding: 10px 0;
        font-size: 14px;
    } 
`
